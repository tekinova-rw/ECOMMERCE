// --- IMPORTANT: Ensure html2canvas is loaded in your HTML for image functionality! ---

let cart = JSON.parse(localStorage.getItem('mymarket_cart') || '[]');
let products = []; // Will store fetched products
let activeCategory = 'all'; // Default active category

// --- 1. DOM ELEMENTS MAPPING ---
const el = {
    grid: document.getElementById('productsGrid'),
    floating: document.getElementById('floatingCart'),
    drawer: document.getElementById('cartDrawer'),
    overlay: document.getElementById('overlay'),
    close: document.getElementById('closeCart'),
    count: document.getElementById('cartCount'),
    list: document.getElementById('cartItemsList'),
    total: document.getElementById('cartTotal'),
    
    // Updated IDs for payment/order elements
    payCodeDisplay: document.getElementById('payCodeDisplay'), // Container for the code
    payCodeAmount: document.getElementById('payCodeAmount'), // Span holding the calculated amount
    withdrawCode: document.getElementById('withdrawCode'),
    whatsappBtn: document.getElementById('whatsappBtn'), // New ID
    downloadBtn: document.getElementById('downloadBtn'), // New ID
    orderSummary: document.getElementById('orderSummaryForImage'), // Hidden container for image capture

    tabsContainer: document.getElementById('tabsContainer'),
    searchInput: document.getElementById('searchInput'),
    
    // Customer Info Inputs
    customerName: document.getElementById('customerName'),
    customerAddress: document.getElementById('customerAddress'),
    customerPhone: document.getElementById('customerPhone'),
};

const catNames = {
    all: 'Byose',
    food: 'Ibiribwa',
    cleaning: 'Isuku & Isukura',
    agriculture: 'Ubuhinzi & Ubworozi',
    services: 'Serivisi',
    cosmetics: 'Ibisobanuro & Imitobe',
    home: 'Ibikoresho byo murugo',
    drinks: 'Ibinyobwa',
    babycare: 'Iby’abana',
    electronics: 'Electronics'
};

// --- 2. PERFORMANCE & INITIAL DATA LOAD ---

document.addEventListener('DOMContentLoaded', () => {
    // 2.1 Start fetching data immediately (non-blocking)
    fetch('products.json')
        .then(r => r.json())
        .then(data => {
            products = data; // Store globally
            createTabs(); // Render tabs
            renderProducts(activeCategory); // Initial product render
            setupSearch(); // Setup search listener
            
            // Hide loader after everything is loaded and rendered
            const loader = document.getElementById('loader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => loader.style.display = 'none', 600);
            }
        })
        .catch(err => console.error("Could not load products:", err));

    // 2.2 Initialize Cart UI immediately for faster perception
    updateCartUI();

    // 2.3 Set up cart drawer events and order buttons
    el.floating.onclick = openCartDrawer;
    el.close.onclick = el.overlay.onclick = closeCartDrawer;
    
    // Check if elements exist before assigning handlers (safety)
    if(el.whatsappBtn) el.whatsappBtn.onclick = sendToWhatsApp;
    if(el.downloadBtn) el.downloadBtn.onclick = downloadOrderImage;
});


// --- 3. CORE UI RENDERING FUNCTIONS ---

function openCartDrawer() {
    el.drawer.classList.add('open');
    el.overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
    el.drawer.classList.remove('open');
    el.overlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function clearCart() {
    if(confirm('Uzi neza ko ushaka gusiba ibiri muri Cart byose?')) {
        cart = [];
        localStorage.removeItem('mymarket_cart');
        updateCartUI();
        alert('Cart yasibwe!');
    }
}
window.clearCart = clearCart; // Expose to HTML

// Auto-create tabs from JSON categories
function createTabs() {
    const allCats = ['all', ...new Set(products.map(p => p.category))];
    el.tabsContainer.innerHTML = '';
    allCats.forEach(cat => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        if (cat === activeCategory) tab.classList.add('active');
        tab.dataset.category = cat;
        tab.textContent = catNames[cat] || cat;
        tab.onclick = () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeCategory = cat;
            renderProducts(cat);
        };
        el.tabsContainer.appendChild(tab);
    });
}

// Render products by category and current search term
function renderProducts(cat) {
    el.grid.innerHTML = '';
    const searchTerm = el.searchInput.value.toLowerCase().trim();
    const filtered = products.filter(p => {
        const categoryMatch = cat === 'all' || p.category === cat;
        const searchMatch = p.name.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
    });

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.id = p.id;
        
        // This template supports both regular and service items
        if (p.isService) {
            card.innerHTML = `
                <img src="${p.img}" alt="${p.name}">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p style="color:var(--orange);font-weight:bold;margin:10px 0;">Hitamo serivisi</p>
                    <select class="type-select">
                        <option value="">-- Hitamo --</option>
                        <option value="send">Kohereza</option>
                        <option value="withdraw">Kubikuza</option>
                        <option value="save">Kubitsa</option>
                    </select>
                    <button class="add-to-cart-btn">
                        <i class="fas fa-cart-plus"></i> Ongeramo muri Cart
                    </button>
                </div>`;
        } else {
            card.innerHTML = `
                <img src="${p.img}" alt="${p.name}">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <div class="price-info">
                        <p><strong>Carton yose:</strong> ${p.fullprice.toLocaleString()} RWF</p>
                        <p><strong>Igice (1/2):</strong> ${p.halfprice.toLocaleString()} RWF</p>
                    </div>
                    <select class="type-select">
                        <option value="">-- Hitamo --</option>
                        <option value="half">Igice (1/2)</option>
                        <option value="full">Carton Yose</option>
                    </select>
                    <div class="halfBox" style="display:none;color:var(--orange);font-weight:bold;margin:10px 0;">Igice cya carton: 1/2</div>
                    <div class="fullBox" style="display:none;">
                        <div class="qty-controls">
                            <button type="button" class="qty-btn minus">−</button>
                            <input type="number" class="qty-input" value="1" min="1">
                            <button type="button" class="qty-btn plus">+</button>
                        </div>
                    </div>
                    <p class="price-box" style="font-weight:bold;color:var(--orange);font-size:1.3rem;margin:12px 0;"></p>
                    <button class="add-to-cart-btn">
                        <i class="fas fa-cart-plus"></i> Ongeramo muri Cart
                    </button>
                </div>`;
        }
        
        el.grid.appendChild(card);
    });

    attachEvents();
}


// --- 4. PRODUCT AND CART MANAGEMENT ---

function attachEvents() {
    // Qty buttons
    document.querySelectorAll('.qty-btn').forEach(b => {
        b.onclick = () => {
            const input = b.parentElement.querySelector('.qty-input');
            let v = parseInt(input.value) || 1;
            if (b.classList.contains('plus')) v++;
            if (b.classList.contains('minus') && v > 1) v--;
            input.value = v;
            updatePrice(b.closest('.product-card'));
        };
    });

    // Type select change
    document.querySelectorAll('.type-select').forEach(s => {
        s.onchange = () => {
            const card = s.closest('.product-card');
            const val = s.value;
            const halfBox = card.querySelector('.halfBox');
            const fullBox = card.querySelector('.fullBox');
            
            if (halfBox && fullBox) {
                halfBox.style.display = val === 'half' ? 'block' : 'none';
                fullBox.style.display = val === 'full' ? 'block' : 'none';
            }
            
            // Hide for services too, if present
            if (!card.dataset.isService) {
                 updatePrice(card);
            } else {
                 card.querySelector('.price-box').textContent = '';
            }
        };
    });

    // Add to cart
    document.querySelectorAll('.add-to-cart-btn').forEach(b => {
        b.onclick = () => addToCart(b.closest('.product-card'));
    });
}

function updatePrice(card) {
    const p = products.find(x => x.id === card.dataset.id);
    const sel = card.querySelector('.type-select').value;
    const box = card.querySelector('.price-box');
    if (!sel || !p || p.isService) { box.textContent = ''; return; }

    if (sel === 'half') {
        box.textContent = `Igiciro: ${p.halfprice.toLocaleString('rw-RW')} RWF`;
    }
    if (sel === 'full') {
        const qty = parseInt(card.querySelector('.qty-input').value) || 1;
        box.textContent = `Igiciro: ${(p.fullprice * qty).toLocaleString('rw-RW')} RWF`;
    }
}

function addToCart(card) {
    const p = products.find(x => x.id === card.dataset.id);
    const select = card.querySelector('.type-select');
    const sel = select.value;
    if (!sel) return alert('Hitamo mbere yo kongeramo!');

    const item = {
        id: p.id,
        name: p.name,
        qty: 1,
        unitPrice: 0,
        price: 0,
        type: sel,
        typeText: select.options[select.selectedIndex].text,
        isService: !!p.isService,
    };

    if (p.isService) {
        item.unitPrice = item.price = 0; // Services are 0 price for now
    } else if (sel === 'half') {
        item.unitPrice = p.halfprice;
        item.price = p.halfprice;
        item.typeText = 'Igice (1/2)';
    } else if (sel === 'full') {
        item.qty = parseInt(card.querySelector('.qty-input').value) || 1;
        item.unitPrice = p.fullprice;
        item.price = p.fullprice * item.qty;
        item.typeText = `Carton Yose`; 
    }

    const existingIndex = cart.findIndex(i => i.id === item.id && i.type === item.type);
    if (existingIndex > -1) {
        cart[existingIndex].qty += item.qty;
        cart[existingIndex].price = cart[existingIndex].unitPrice * cart[existingIndex].qty;
    } else {
        cart.push(item);
    }

    localStorage.setItem('mymarket_cart', JSON.stringify(cart));
    updateCartUI();
    alert('Byongewe muri cart!');
    openCartDrawer();
}

/**
 * Function yo gukura item muri cart. 
 * @param {number} index Index y'ibicuruzwa muri cart array.
 */
window.removeItem = index => {
    cart.splice(index, 1);
    localStorage.setItem('mymarket_cart', JSON.stringify(cart));
    updateCartUI();
};

// Live Search
function setupSearch() {
    el.searchInput?.addEventListener('input', () => {
        renderProducts(activeCategory); // Re-render the current category based on search term
    });
}


// --- 5. CART UI UPDATE & INFO DISPLAY ---

function updateCartUI() {
    const totalItems = cart.reduce((s, i) => s + i.qty, 0);
    const cartTotal = cart.reduce((s, i) => s + i.price, 0);
    const formattedTotal = cartTotal.toLocaleString('rw-RW');
    
    el.count.textContent = totalItems || '0';
    el.total.textContent = `TOTAL: ${formattedTotal} RWF`;
    
    const isCartEmpty = cart.length === 0;

    // Update payment code info and buttons
    el.payCodeDisplay.style.display = isCartEmpty ? 'none' : 'block';
    if (el.payCodeAmount) el.payCodeAmount.textContent = cartTotal.toLocaleString();
    
    el.downloadBtn.disabled = isCartEmpty;
    el.whatsappBtn.disabled = isCartEmpty;
    
    // Check for "Withdraw" services
    const hasWithdraw = cart.some(i => i.isService && i.type === 'withdraw');
    el.withdrawCode.style.display = hasWithdraw ? 'block' : 'none';

    if (isCartEmpty) {
        el.list.innerHTML = '<p style="text-align:center;color:#999;padding:60px 0;">Cart iracyari ubusa</p>';
        return;
    }

    let html = '';
    cart.forEach((it, i) => {
        const itemTotal = it.price.toLocaleString('rw-RW');
        // Kugaragaza ubwoko n'umubare ku buryo buciriritse
        const unitText = it.type === 'full' ? `Carton Yose x ${it.qty}` : it.typeText; 
        
        html += `<div class="cart-item">
            <div style="flex-grow:1;">
                <strong>${it.name}</strong><br>
                <small style="color:#777; font-size:0.9rem;">${unitText}</small>
            </div>
            <div style="text-align:right; display:flex; align-items:center; gap:15px;">
                <strong class="cart-item-price">${itemTotal} RWF</strong>
                <button class="remove-item" onclick="removeItem(${i})" style="background:none; border:none; color:#e74c3c; font-size:1.8rem; cursor:pointer; padding:0 5px;">
                    &times; </button>
            </div>
        </div>`;
    });
    el.list.innerHTML = html;
    
    // Always render the hidden summary container to be ready for capture
    renderOrderSummaryForImage(cartTotal);
}


// --- 6. WHATSAPP & IMAGE DOWNLOAD UTILITIES ---

window.sendToWhatsApp = function() {
    if (cart.length === 0) return alert('Cart iracyari ubusa!');
    
    // Validate customer info
    const name = el.customerName.value.trim();
    const address = el.customerAddress.value.trim();
    const phone = el.customerPhone.value.trim();
    if (!name || !address || !phone) return alert('Uzuzamo Amazina, Aho Utuye, na Telephone mbere yo gutumiza!');

    const cartTotal = cart.reduce((s, i) => s + i.price, 0);

    let msg = `*ORDER Y'IBICURUZWA - MYMARKET*%0A%0A`;
    msg += `👤 Izina: ${name}%0A`;
    msg += `📍 Aho batumiza: ${address}%0A`;
    msg += `📞 Telefone: ${phone}%0A%0A`;
    msg += `*🛒 IBICURUZWA:*%0A`;

    cart.forEach(i => {
        const unitText = i.type === 'full' ? `Carton Yose x ${i.qty}` : i.typeText;
        msg += `• ${i.name} (${unitText})%0A   ➜ Igiciro: ${i.price.toLocaleString('rw-RW')} RWF%0A`;
    });

    msg += `*===========================*%0A`;
    msg += `*💰 TOTAL: ${cartTotal.toLocaleString('rw-RW')} RWF*%0A`;
    msg += `*===========================*%0A`;
    msg += `*Kwishyura M-Pesa:* %0A*182*8*1*${cartTotal}frw#*%0A%0A`;
    msg += `Murakoze kutwifuza! Tuzabageza vuba!`;

    // Replace with your actual WhatsApp number
    const whatsappNumber = '250780019239'; 
    window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
}

// Function to generate and download order summary image
function renderOrderSummaryForImage(total) {
    const name = el.customerName.value.trim() || "Amazina y'umukiliya";
    const address = el.customerAddress.value.trim() || "Aho atuye";
    const phone = el.customerPhone.value.trim() || "07...";
    
    let itemsHTML = cart.map(i => {
        const unitText = i.type === 'full' ? `Carton Yose x ${i.qty}` : i.typeText;
        return `
            <div style="display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dashed #eee5;">
                <span style="font-weight:500; font-size:1rem; flex:1;">${i.name} (${unitText})</span>
                <span style="font-weight:700; color:#d35400;">${i.price.toLocaleString('rw-RW')} RWF</span>
            </div>
        `;
    }).join('');

    // Renders a styled summary to the hidden container
    el.orderSummary.innerHTML = `
        <div style="width:100%; max-width:400px; padding:25px; background:white; border-radius:12px; box-shadow:0 0 15px rgba(0,0,0,0.1); font-family:'Rubik', sans-serif; border:3px solid #2c3e50;">
            <h2 style="color:#e67e22; text-align:center; border-bottom:3px solid #e67e22; padding-bottom:12px; margin-bottom:15px; font-size:1.6rem;">ORDER YACU - MyMarket</h2>
            
            <h3 style="margin-top:15px; color:#2c3e50; font-size:1.2rem;">👤 Amakuru y'Umukiliya</h3>
            <p style="margin:5px 0;"><strong>Izina:</strong> ${name}</p>
            <p style="margin:5px 0;"><strong>Aho batumiza:</strong> ${address}</p>
            <p style="margin:5px 0; border-bottom:1px solid #ddd; padding-bottom:10px;"><strong>Telefone:</strong> ${phone}</p>
            
            <h3 style="margin-top:15px; color:#2c3e50; font-size:1.2rem;">🛒 Ibicuruzwa</h3>
            <div style="padding:5px 0;">
                ${itemsHTML}
            </div>

            <div style="background:#2c3e50; color:white; padding:18px; border-radius:8px; margin-top:20px; text-align:center;">
                <p style="font-size:1.8rem; font-weight:700; margin:0;">TOTAL: ${total.toLocaleString('rw-RW')} RWF</p>
            </div>
            
            <p style="margin-top:15px; font-size:1rem; text-align:center; color:#27ae60; font-weight:bold;">Kwishyura M-Pesa: *182*8*1*${total}frw#</p>
        </div>
    `;
}

window.downloadOrderImage = function() {
    if (cart.length === 0) return alert('Cart iracyari ubusa!');
    if (typeof html2canvas === 'undefined') {
        return alert("Error: Library 'html2canvas' not loaded. Check the script tag for html2canvas in index.html.");
    }

    // Ensure the summary is up to date before capturing
    const cartTotal = cart.reduce((s, i) => s + i.price, 0);
    renderOrderSummaryForImage(cartTotal);
    
    const summaryElement = el.orderSummary.querySelector('div'); // Capture the inner styled div
    
    // Temporarily position and make the container visible (but off-screen) for accurate rendering
    el.orderSummary.style.position = 'absolute';
    el.orderSummary.style.top = '-9999px';
    el.orderSummary.style.left = '-9999px';
    el.orderSummary.style.zIndex = '9999';
    el.orderSummary.style.display = 'block';

    html2canvas(summaryElement, { 
        scale: 3, // High resolution image
        backgroundColor: '#f5f7fa', // Matches body background
        useCORS: true 
    }).then(canvas => {
        // Hide it again
        el.orderSummary.style.display = 'none';

        const link = document.createElement('a');
        link.download = `MyMarket_Order_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        alert('Ifoto y’ubutumwa yatwawe neza!');
    });
}

// Ensure updateCartUI is called to load data from localStorage on script load
updateCartUI();