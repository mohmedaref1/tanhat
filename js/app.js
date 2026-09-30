/**
 * Tanhat Tourism & MMO - Core Script
 * Features: Multi-language auto-detect (AR/EN), Scroll Logo Shrink,
 * Dynamic WhatsApp message generator, Carousel & Client-side Rate Limiter.
 */

document.addEventListener('DOMContentLoaded', () => {
  const WHATSAPP_PHONE = '201000798185';
  let currentLang = 'ar';
  let currentFleetCategory = 'limousine';
  let setFleetCategoryGlobal = null;
  let syncHeaderFleetTab = null;

  const isEnSubdir = window.location.pathname.includes('/en/') || window.location.pathname.endsWith('/en') || window.location.pathname.endsWith('/en/index.html');

  function resolveAssetPath(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/') || path.startsWith('data:')) {
      return path;
    }
    return isEnSubdir ? `../${path}` : path;
  }

  // 1. Language Auto-Detection & Switching
  function detectInitialLanguage() {
    // 1. If HTML explicitly sets lang="en" or lang="ar"
    const htmlLang = document.documentElement.lang;
    if (isEnSubdir || htmlLang === 'en') {
      return 'en';
    }
    // 2. Query param ?lang=ar or ?lang=en
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    if (urlLang === 'ar' || urlLang === 'en') {
      return urlLang;
    }
    // 3. Saved localStorage preference
    const saved = localStorage.getItem('tanhat_lang');
    if (saved && (saved === 'ar' || saved === 'en')) {
      return saved;
    }
    // 4. Browser language
    const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || 'ar';
    return browserLang.toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('tanhat_lang', lang);

    const htmlEl = document.documentElement;
    htmlEl.lang = lang;
    htmlEl.dir = lang === 'ar' ? 'rtl' : 'ltr';

    // Update Meta Tags
    document.title = translations[lang].meta_title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', translations[lang].meta_desc);
    }

    // Update text nodes
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[lang][key]) {
        el.setAttribute('placeholder', translations[lang][key]);
      }
    });

    // Update language toggle buttons active state
    const btnAr = document.getElementById('lang-ar');
    const btnEn = document.getElementById('lang-en');
    if (btnAr && btnEn) {
      if (lang === 'ar') {
        btnAr.classList.add('active');
        btnEn.classList.remove('active');
      } else {
        btnEn.classList.add('active');
        btnAr.classList.remove('active');
      }
    }

    // Update Fleet Showcase dynamic language
    if (typeof updateFleetLanguage === 'function') {
      updateFleetLanguage(lang);
    }

    // Refresh all direct WhatsApp links with updated language text
    refreshWhatsAppLinks(lang);
  }

  // Mobile Menu Toggle & Navigation Links
  const siteHeader = document.getElementById('siteHeader');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const navMenu = document.getElementById('navMenu');
  const navLinks = navMenu ? Array.from(navMenu.querySelectorAll('.nav-link')) : [];
  const brandLogo = document.querySelector('.header-brand');

  function closeMobileMenu() {
    if (navMenu && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      if (siteHeader) siteHeader.classList.remove('menu-open');
      if (mobileMenuBtn) {
        mobileMenuBtn.textContent = '☰';
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      }
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
  }

  if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle('open');
      if (siteHeader) siteHeader.classList.toggle('menu-open', isOpen);
      mobileMenuBtn.textContent = isOpen ? '✕' : '☰';
      mobileMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
      document.documentElement.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close menu when a navigation link is clicked and smooth scroll
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        closeMobileMenu();
        if (href && href.startsWith('#')) {
          const target = document.querySelector(href);
          if (target) {
            e.preventDefault();
            requestAnimationFrame(() => {
              target.scrollIntoView({ behavior: 'smooth' });
            });
          }
        }
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    });

    // Close when tapping outside the header/menu
    document.addEventListener('click', (e) => {
      if (navMenu.classList.contains('open') && siteHeader && !siteHeader.contains(e.target)) {
        closeMobileMenu();
      }
    });

    // Auto-close if resized to desktop viewport
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        closeMobileMenu();
      }
    });
  }

  const btnAr = document.getElementById('lang-ar');
  const btnEn = document.getElementById('lang-en');
  if (btnAr) {
    btnAr.addEventListener('click', () => {
      localStorage.setItem('tanhat_lang', 'ar');
      if (isEnSubdir) {
        window.location.href = '../index.html';
      } else {
        setLanguage('ar');
      }
    });
  }
  if (btnEn) {
    btnEn.addEventListener('click', () => {
      localStorage.setItem('tanhat_lang', 'en');
      if (!isEnSubdir) {
        window.location.href = 'en/index.html';
      } else {
        setLanguage('en');
      }
    });
  }

  // 2. Scroll Header, Logo Shrinking & Dynamic ScrollSpy (Section in View Detection)

  const sectionIds = ['hero', 'services', 'hotels', 'limousine', 'about', 'contact-booking'];
  const trackedSections = sectionIds
    .map(id => ({ id, el: document.getElementById(id) }))
    .filter(item => item.el !== null);

  let isClickScrolling = false;
  let clickScrollTimeout = null;

  function setActiveNavLink(targetId, fleetTarget = null) {
    if (!navLinks.length) return;

    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      const dataFleetTarget = link.getAttribute('data-fleet-target');
      let isMatch = false;

      if (targetId === 'limousine') {
        const activeCategory = fleetTarget || currentFleetCategory || 'limousine';
        isMatch = (href === '#limousine' && dataFleetTarget === activeCategory);
      } else {
        isMatch = (href === '#' + targetId);
      }

      if (isMatch) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  syncHeaderFleetTab = function(catName) {
    const limoEl = document.getElementById('limousine');
    if (!limoEl) return;
    const rect = limoEl.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.6 && rect.bottom >= window.innerHeight * 0.25) {
      setActiveNavLink('limousine', catName);
    }
  };

  function updateScrollSpy() {
    if (isClickScrolling) return;

    const scrollY = window.scrollY || window.pageYOffset;
    const windowHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;

    // 1. Very top of the page -> Always highlight Hero
    if (scrollY < 100) {
      setActiveNavLink('hero');
      return;
    }

    // 2. Near bottom of page -> Always highlight Contact Us
    if (windowHeight + scrollY >= docHeight - 40) {
      setActiveNavLink('contact-booking');
      return;
    }

    // 3. Middle sections: probe line at ~35% of viewport height (accounting for sticky header)
    const probe = scrollY + Math.min(windowHeight * 0.35, 260);

    let activeSectionId = null;
    for (let i = trackedSections.length - 1; i >= 0; i--) {
      const section = trackedSections[i];
      const top = section.el.offsetTop;
      const height = section.el.offsetHeight;
      if (probe >= top && probe < top + height) {
        activeSectionId = section.id;
        break;
      }
    }

    // Fallback if between sections
    if (!activeSectionId) {
      for (let i = trackedSections.length - 1; i >= 0; i--) {
        if (probe >= trackedSections[i].el.offsetTop) {
          activeSectionId = trackedSections[i].id;
          break;
        }
      }
    }

    if (activeSectionId) {
      setActiveNavLink(activeSectionId);
    }
  }

  function handleHeaderScroll() {
    if (!siteHeader) return;
    const scrollY = window.scrollY || window.pageYOffset;
    if (scrollY > 40) {
      siteHeader.classList.add('scrolled');
    } else {
      siteHeader.classList.remove('scrolled');
    }
  }

  let scrollTicking = false;
  function onScrollOrResize() {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        handleHeaderScroll();
        updateScrollSpy();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });
  onScrollOrResize();

  // Navigation Links Click Handling
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      const targetId = href.substring(1);
      const fleetTarget = link.getAttribute('data-fleet-target');

      if (targetId === 'limousine' && fleetTarget && typeof setFleetCategoryGlobal === 'function') {
        setFleetCategoryGlobal(fleetTarget);
      }

      setActiveNavLink(targetId, fleetTarget);

      // Lock scrollspy briefly during smooth scroll transition
      isClickScrolling = true;
      clearTimeout(clickScrollTimeout);
      clickScrollTimeout = setTimeout(() => {
        isClickScrolling = false;
        updateScrollSpy();
      }, 850);
    });
  });

  if (brandLogo) {
    brandLogo.addEventListener('click', () => {
      setActiveNavLink('hero');
      isClickScrolling = true;
      clearTimeout(clickScrollTimeout);
      clickScrollTimeout = setTimeout(() => {
        isClickScrolling = false;
        updateScrollSpy();
      }, 850);
    });
  }

  // 3. Client-Side Security & Rate Limiting Guard
  const rateLimitState = {
    clicks: 0,
    lastReset: Date.now()
  };

  function checkRateLimit() {
    const now = Date.now();
    if (now - rateLimitState.lastReset > 10000) {
      rateLimitState.clicks = 0;
      rateLimitState.lastReset = now;
    }
    rateLimitState.clicks++;
    if (rateLimitState.clicks > 5) {
      const msg = currentLang === 'ar' 
        ? 'يرجى الانتظار بضع ثوانٍ قبل إرسال طلب جديد.' 
        : 'Please wait a few seconds before sending another request.';
      alert(msg);
      return false;
    }
    return true;
  }

  // 4. Native WhatsApp Link Synchronizer (Keeps real hrefs on all WhatsApp anchors)
  function refreshWhatsAppLinks(lang = currentLang) {
    const cleanPhone = WHATSAPP_PHONE.replace(/[^0-9]/g, '');
    const t = translations[lang] || translations.ar;

    // 1. General WhatsApp anchors (Hero, Contact card badge, Direct WA item, Footer VIP, Floating)
    const defaultMsg = encodeURIComponent(t.wa_default_msg);
    document.querySelectorAll('a[data-wa-type="general"]').forEach((el) => {
      el.href = `https://wa.me/${cleanPhone}?text=${defaultMsg}`;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });

    // 2. Service WhatsApp anchors
    document.querySelectorAll('a[data-wa-type="service"]').forEach((el) => {
      const srvName = el.getAttribute('data-service-name') || '';
      const msg = `${t.wa_service_prefix}${srvName}`;
      el.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });

    // 3. Hotel Modal Cards
    document.querySelectorAll('a.btn-modal-book[data-wa-type="hotel"]').forEach((el) => {
      const hotelName = el.getAttribute('data-hotel-name') || '';
      const msg = `${t.wa_hotel_prefix}${hotelName}`;
      el.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
      el.target = '_blank';
      el.rel = 'noopener noreferrer';
    });

    // 4. Update Fleet button if available
    if (typeof updateFleetWhatsAppLink === 'function') {
      updateFleetWhatsAppLink();
    }
  }

  // Safe fallback routing (Used only if programmatic trigger is needed, bypasses popup blocker heuristic)
  function openWhatsApp(messageText) {
    if (!checkRateLimit()) return;
    const cleanPhone = WHATSAPP_PHONE.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(messageText || translations[currentLang].wa_default_msg);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;

    // On mobile devices, native window.location triggers the installed WhatsApp app directly
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = url;
      return;
    }

    // On desktop, dispatch a genuine anchor click without windowFeatures
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Allow clicking anywhere on service card to natively trigger its WhatsApp link
  document.querySelectorAll('.service-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      const arrowLink = card.querySelector('.service-arrow-btn');
      if (!arrowLink) return;
      if (e.target === arrowLink || arrowLink.contains(e.target)) return;
      arrowLink.click();
    });
  });

  // Accessible keyboard activation for interactive service cards
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.service-card[role="button"]');
      if (card) {
        e.preventDefault();
        const arrowLink = card.querySelector('.service-arrow-btn');
        if (arrowLink) arrowLink.click();
      }
    }
  });

  // Client-side rate limiting guard for all WhatsApp anchor clicks (Prevents spamming)
  document.addEventListener('click', (e) => {
    const waLink = e.target.closest('a[href*="wa.me"]');
    if (!waLink) return;
    if (!checkRateLimit()) {
      e.preventDefault();
    }
  });

  // Hero Search / Booking Form Submission to WhatsApp (Native Form Navigation)
  const bookingForm = document.getElementById('heroBookingForm');
  if (bookingForm) {
    // Tab switching
    const tabs = bookingForm.querySelectorAll('.booking-tab-btn');
    let currentServiceTab = 'hotel';

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        currentServiceTab = tab.getAttribute('data-tab');

        // Micro-animation feedback on fields container
        const fieldsGrid = bookingForm.querySelector('.booking-fields-grid');
        if (fieldsGrid) {
          fieldsGrid.classList.remove('tab-switched');
          void fieldsGrid.offsetWidth; // Force reflow to restart CSS animation
          fieldsGrid.classList.add('tab-switched');
        }
      });
    });

    bookingForm.addEventListener('submit', (e) => {
      if (!checkRateLimit()) {
        e.preventDefault();
        return;
      }

      const destSelect = document.getElementById('bookDestination');
      const guestsSelect = document.getElementById('bookGuests');
      const arrivalInput = document.getElementById('bookArrival');
      const departInput = document.getElementById('bookDeparture');

      const destVal = destSelect && destSelect.value ? destSelect.options[destSelect.selectedIndex].text : '';
      const guestsVal = guestsSelect && guestsSelect.value ? guestsSelect.options[guestsSelect.selectedIndex].text : '';
      const arrivalVal = arrivalInput ? arrivalInput.value.trim() : '';
      const departVal = departInput ? departInput.value.trim() : '';

      let srvName = '';
      if (currentServiceTab === 'hotel') srvName = translations[currentLang].tab_hotel;
      else if (currentServiceTab === 'limo') srvName = translations[currentLang].tab_limo;
      else if (currentServiceTab === 'car') srvName = translations[currentLang].tab_car;

      const t = translations[currentLang];
      const lines = [t.wa_booking_prefix.trim()];
      
      if (srvName) lines.push(`${t.wa_service_label}${srvName}`);
      if (destVal) lines.push(`${t.wa_dest_label}${destVal}`);
      if (guestsVal) lines.push(`${t.wa_guests_label}${guestsVal}`);
      if (arrivalVal) lines.push(`${t.wa_arrival_label}${arrivalVal}`);
      if (departVal) lines.push(`${t.wa_depart_label}${departVal}`);

      const compiled = lines.join('\n');
      const hiddenInput = document.getElementById('heroWaText');
      if (hiddenInput) {
        hiddenInput.value = compiled;
      }
      // Native form submission navigates to action="https://wa.me/201000798185" with target="_blank"
    });
  }

  // 5. Contact Section Form Submission to WhatsApp (Native Form Navigation)
  const contactBookingForm = document.getElementById('contactBookingForm');
  if (contactBookingForm) {
    contactBookingForm.addEventListener('submit', (e) => {
      const nameInput = document.getElementById('contactName');
      const phoneInput = document.getElementById('contactPhone');
      const serviceSelect = document.getElementById('contactService');
      const dateInput = document.getElementById('contactDate');
      const notesInput = document.getElementById('contactNotes');

      const nameVal = nameInput ? nameInput.value.trim() : '';
      const phoneVal = phoneInput ? phoneInput.value.trim() : '';
      const serviceVal = serviceSelect && serviceSelect.value ? serviceSelect.options[serviceSelect.selectedIndex].text : '';
      const dateVal = dateInput ? dateInput.value.trim() : '';
      const notesVal = notesInput ? notesInput.value.trim() : '';

      if (!nameVal || !phoneVal) {
        e.preventDefault();
        alert(currentLang === 'ar' ? 'يرجى كتابة الاسم ورقم الهاتف للمتابعة' : 'Please provide your name and phone number to proceed');
        return;
      }

      if (!checkRateLimit()) {
        e.preventDefault();
        return;
      }

      const t = translations[currentLang];
      const lines = [t.wa_contact_prefix.trim()];

      if (nameVal) lines.push(`• ${t.contact_form_name}: ${nameVal}`);
      if (phoneVal) lines.push(`• ${t.contact_form_phone}: ${phoneVal}`);
      if (serviceVal) lines.push(`• ${t.contact_form_service}: ${serviceVal}`);
      if (dateVal) lines.push(`• ${t.contact_form_date}: ${dateVal}`);
      if (notesVal) lines.push(`• ${t.contact_form_notes}: ${notesVal}`);

      const compiled = lines.join('\n');
      const hiddenInput = document.getElementById('contactWaText');
      if (hiddenInput) {
        hiddenInput.value = compiled;
      }
      // Native form submission navigates to action="https://wa.me/201000798185" with target="_blank"
    });
  }

  // 6. Hotels Detailed Pop-Up Modal
  const hotelsModal = document.getElementById('allHotelsModal');
  const btnOpenHotelsModal = document.getElementById('btnOpenHotelsModal');
  const btnCloseHotelsModal = document.getElementById('btnCloseHotelsModal');
  const modalFilterBtns = document.querySelectorAll('.modal-filter-btn');

  // Completely lock background scrolling on root & body
  const lockScroll = () => {
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
  };

  const unlockScroll = () => {
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.documentElement.style.overscrollBehavior = '';
    document.body.style.overscrollBehavior = '';
  };

  if (hotelsModal && btnOpenHotelsModal) {
    btnOpenHotelsModal.addEventListener('click', () => {
      hotelsModal.classList.remove('is-closing');
      if (typeof hotelsModal.showModal === 'function') {
        hotelsModal.showModal();
      } else {
        hotelsModal.setAttribute('open', '');
      }
      lockScroll();

      // Trigger card load animation on open
      const visibleCards = hotelsModal.querySelectorAll('.modal-hotel-card');
      visibleCards.forEach((c, idx) => {
        c.style.animationDelay = `${idx * 0.05}s`;
        c.classList.add('modal-card-entering');
      });
    });

    let isClosingModal = false;
    const closeModal = () => {
      if (isClosingModal) return;
      isClosingModal = true;
      hotelsModal.classList.add('is-closing');
      setTimeout(() => {
        if (typeof hotelsModal.close === 'function') {
          hotelsModal.close();
        } else {
          hotelsModal.removeAttribute('open');
        }
        hotelsModal.classList.remove('is-closing');
        unlockScroll();
        isClosingModal = false;
      }, 220);
    };

    if (btnCloseHotelsModal) {
      btnCloseHotelsModal.addEventListener('click', closeModal);
    }

    // Handle native dialog close & cancel events
    hotelsModal.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeModal();
    });

    hotelsModal.addEventListener('close', () => {
      unlockScroll();
    });

    // Close on clicking backdrop
    hotelsModal.addEventListener('click', (e) => {
      const rect = hotelsModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog || e.target === hotelsModal) {
        closeModal();
      }
    });

    // Prevent wheel and touch scrolling behind the popup when on the backdrop
    const preventBackdropScroll = (e) => {
      const dialogContent = hotelsModal.querySelector('.modal-dialog-content');
      if (!dialogContent || !dialogContent.contains(e.target) || e.target === hotelsModal) {
        e.preventDefault();
      }
    };

    hotelsModal.addEventListener('wheel', preventBackdropScroll, { passive: false });
    hotelsModal.addEventListener('touchmove', preventBackdropScroll, { passive: false });

    // Filter Tabs with Item Load / Unload Animations
    modalFilterBtns.forEach((filterBtn) => {
      filterBtn.addEventListener('click', () => {
        modalFilterBtns.forEach((b) => b.classList.remove('active'));
        filterBtn.classList.add('active');

        const filter = filterBtn.getAttribute('data-filter');
        let visibleIdx = 0;
        const currentModalCards = document.querySelectorAll('.modal-hotel-card');
        currentModalCards.forEach((card) => {
          const categoryAttr = card.getAttribute('data-category') || '';
          const categories = categoryAttr.split(/\s+/);
          const shouldShow = (filter === 'all' || categories.includes(filter) || categoryAttr === filter);

          if (shouldShow) {
            card.style.display = 'flex';
            card.style.animationDelay = `${visibleIdx * 0.05}s`;
            card.classList.remove('item-unload');
            card.classList.add('item-load');
            visibleIdx++;
          } else {
            card.classList.add('item-unload');
            card.classList.remove('item-load');
            setTimeout(() => {
              if (card.classList.contains('item-unload')) {
                card.style.display = 'none';
              }
            }, 200);
          }
        });
      });
    });
  }

  // 7. Carousel Controls for Hotel Slider
  const carouselTrack = document.getElementById('hotelsCarouselTrack');
  const prevBtn = document.getElementById('hotelsPrevBtn');
  const nextBtn = document.getElementById('hotelsNextBtn');

  if (carouselTrack && prevBtn && nextBtn) {
    const cardStep = 280;
    prevBtn.addEventListener('click', () => {
      carouselTrack.scrollBy({ left: -cardStep, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      carouselTrack.scrollBy({ left: cardStep, behavior: 'smooth' });
    });

    // Allow clicking any hotel card in the carousel to open full details modal
    carouselTrack.querySelectorAll('.hotel-card').forEach((c) => {
      c.addEventListener('click', () => {
        if (btnOpenHotelsModal) btnOpenHotelsModal.click();
      });
    });
  }

  // Set today's date as min for date pickers
  const today = new Date().toISOString().split('T')[0];
  const arrivalInput = document.getElementById('bookArrival');
  const departInput = document.getElementById('bookDeparture');
  const contactDateInput = document.getElementById('contactDate');
  if (arrivalInput) arrivalInput.min = today;
  if (departInput) departInput.min = today;
  if (contactDateInput) contactDateInput.min = today;

  // 8. Scroll-Triggered Reveal System (Smooth Progressive Entrance)
  const animElements = document.querySelectorAll('[data-animate]');
  if (animElements.length > 0) {
    document.documentElement.classList.add('js-anim-ready');

    const revealEl = (el) => {
      if (el) {
        el.classList.add('is-visible');
        el.classList.remove('is-unloaded');
      }
    };

    if ('IntersectionObserver' in window) {
      const animObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            revealEl(entry.target);
            animObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.05,
        rootMargin: '0px 0px 60px 0px'
      });

      animElements.forEach((el) => {
        animObserver.observe(el);
      });
    }

    const checkVisibility = () => {
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      animElements.forEach((el) => {
        if (!el.classList.contains('is-visible')) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= windowHeight * 0.96 && rect.bottom >= 0) {
            revealEl(el);
          }
        }
      });
    };

    // Immediate check on load and scroll/resize events
    requestAnimationFrame(checkVisibility);
    window.addEventListener('scroll', checkVisibility, { passive: true });
    window.addEventListener('resize', checkVisibility, { passive: true });
  }

  // 9. Interactive Luxury Fleet Showcase (3D Driving Slider, Categories, WhatsApp & Auto-switch)
  let updateFleetLanguage = null;

  const fleetShowcaseCard = document.getElementById('fleetShowcaseCard');
  const fleetTabLimo = document.getElementById('fleetTabLimo');
  const fleetTabRent = document.getElementById('fleetTabRent');
  const fleetActiveBadgeText = document.getElementById('fleetActiveBadgeText');
  const fleetCounterCurr = document.getElementById('fleetCounterCurr');
  const fleetCounterTotal = document.getElementById('fleetCounterTotal');
  const fleetCarClass = document.getElementById('fleetCarClass');
  const fleetCarName = document.getElementById('fleetCarName');
  const fleetCarDesc = document.getElementById('fleetCarDesc');
  const fleetTagsList = document.getElementById('fleetTagsList');
  const fleetSpecsList = document.getElementById('fleetSpecsList');
  const fleetMainImg = document.getElementById('fleetMainImg');
  const fleetCarCanvas = document.getElementById('fleetCarCanvas');
  const fleetCarShadow = document.getElementById('fleetCarShadow');
  const fleetColInfo = document.getElementById('fleetColInfo');
  const fleetColSpecs = document.getElementById('fleetColSpecs');
  const fleetPrevBtn = document.getElementById('fleetPrevBtn');
  const fleetNextBtn = document.getElementById('fleetNextBtn');
  const fleetWaBtn = document.getElementById('fleetWaBtn');
  const fleetGalleryTrack = document.getElementById('fleetGalleryTrack');

  if (fleetShowcaseCard && typeof fleetCarsData !== 'undefined') {
    let currentFleetCategory = 'limousine';
    let currentCarIndex = 0;
    let isCarTransitioning = false;
    let fleetAutoplayTimer = null;
    let fleetManualPauseTimer = null;

    // SVG icon templates
    const specIcons = {
      users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
      briefcase: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>',
      climate: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg>',
      gear: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',
      shield: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
      star: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>'
    };

    // Preload car images to guarantee zero-latency 3D transitions
    function preloadFleetImages() {
      Object.values(fleetCarsData).forEach(category => {
        category.forEach(car => {
          const img = new Image();
          img.src = resolveAssetPath(car.img);
        });
      });
    }
    preloadFleetImages();

    // Dynamically update Fleet WhatsApp Anchor with direct link & pre-filled text
    function updateFleetWhatsAppLink() {
      if (!fleetWaBtn) return;
      const cars = fleetCarsData[currentFleetCategory];
      if (!cars || !cars[currentCarIndex]) return;
      const car = cars[currentCarIndex];
      const carData = car[currentLang] || car.ar;
      const prefix = currentFleetCategory === 'limousine'
        ? translations[currentLang].wa_fleet_limo_prefix
        : translations[currentLang].wa_fleet_rent_prefix;
      const suffix = translations[currentLang].wa_fleet_suffix;
      const compiledMsg = `${prefix}${carData.name}${suffix}`;
      const cleanPhone = WHATSAPP_PHONE.replace(/[^0-9]/g, '');
      fleetWaBtn.href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(compiledMsg)}`;
      fleetWaBtn.target = '_blank';
      fleetWaBtn.rel = 'noopener noreferrer';
    }

    // Populate car details (text, pills, specs)
    function populateCarDetails(car) {
      const data = car[currentLang] || car.ar;
      if (fleetCarClass) fleetCarClass.textContent = data.category;
      if (fleetCarName) fleetCarName.textContent = data.name;
      if (fleetCarDesc) fleetCarDesc.textContent = data.desc;

      // Tags
      if (fleetTagsList) {
        fleetTagsList.innerHTML = '';
        data.tags.forEach(tag => {
          const pill = document.createElement('span');
          pill.className = 'fleet-tag-pill';
          pill.textContent = tag;
          fleetTagsList.appendChild(pill);
        });
      }

      // Specs
      if (fleetSpecsList) {
        fleetSpecsList.innerHTML = '';
        data.specs.forEach(spec => {
          const li = document.createElement('li');
          li.className = 'fleet-spec-item';
          const iconSvg = specIcons[spec.icon] || specIcons.star;
          li.innerHTML = `
            <span class="fleet-spec-icon" aria-hidden="true">${iconSvg}</span>
            <span class="fleet-spec-label">${spec.label}:</span>
            <span class="fleet-spec-val">${spec.val}</span>
          `;
          fleetSpecsList.appendChild(li);
        });
      }

      // Keep WhatsApp booking button link synced to the active car
      updateFleetWhatsAppLink();
    }

    // Render Gallery Thumbnails at bottom
    function renderFleetThumbnails() {
      const cars = fleetCarsData[currentFleetCategory];
      if (!cars || !fleetGalleryTrack) return;
      fleetGalleryTrack.innerHTML = '';

      cars.forEach((car, index) => {
        const carData = car[currentLang] || car.ar;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `fleet-thumb-card${index === currentCarIndex ? ' active' : ''}`;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', index === currentCarIndex ? 'true' : 'false');
        btn.setAttribute('aria-label', carData.name);
        btn.innerHTML = `
          <img src="${resolveAssetPath(car.img)}" alt="${carData.name}" class="fleet-thumb-img" loading="lazy">
          <span class="fleet-thumb-title">${carData.name}</span>
        `;

        btn.addEventListener('click', () => {
          if (currentCarIndex === index) return;
          pauseAutoplayTemporary(9000);
          goToCar(index, true);
        });

        fleetGalleryTrack.appendChild(btn);
      });
    }

    // Highlight active thumbnail and scroll container horizontally WITHOUT forcing window scroll
    function updateActiveThumbnail() {
      if (!fleetGalleryTrack) return;
      const thumbs = fleetGalleryTrack.querySelectorAll('.fleet-thumb-card');
      thumbs.forEach((th, idx) => {
        if (idx === currentCarIndex) {
          th.classList.add('active');
          th.setAttribute('aria-selected', 'true');
          
          // Center the active thumbnail inside the horizontal gallery track only
          const trackWidth = fleetGalleryTrack.clientWidth;
          const thumbLeft = th.offsetLeft;
          const thumbWidth = th.offsetWidth;
          const targetScroll = thumbLeft - (trackWidth / 2) + (thumbWidth / 2);
          fleetGalleryTrack.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
          });
        } else {
          th.classList.remove('active');
          th.setAttribute('aria-selected', 'false');
        }
      });
    }

    let currentDisplayedCarId = null;
    let transitionTimerPhase1 = null;
    let transitionTimerPhase2 = null;

    // Reset visual state and cancel any in-flight transitions cleanly
    function resetCarVisualState() {
      if (transitionTimerPhase1) {
        clearTimeout(transitionTimerPhase1);
        transitionTimerPhase1 = null;
      }
      if (transitionTimerPhase2) {
        clearTimeout(transitionTimerPhase2);
        transitionTimerPhase2 = null;
      }
      isCarTransitioning = false;
      if (fleetCarCanvas) {
        fleetCarCanvas.classList.remove('car-drive-away', 'car-drive-prepare');
      }
      if (fleetCarShadow) {
        fleetCarShadow.classList.remove('shadow-drive-away', 'shadow-drive-prepare');
      }
      if (fleetColInfo) {
        fleetColInfo.style.opacity = '1';
        fleetColInfo.style.transform = 'translateY(0)';
      }
      if (fleetColSpecs) {
        fleetColSpecs.style.opacity = '1';
        fleetColSpecs.style.transform = 'translateY(0)';
      }
    }

    // 3D Drive Transition: Previous car drives away left-down, new car arrives from right-depth
    function goToCar(index, animate = true) {
      const cars = fleetCarsData[currentFleetCategory];
      if (!cars || cars.length === 0) return;

      if (index < 0) index = cars.length - 1;
      if (index >= cars.length) index = 0;

      const nextCar = cars[index];

      // If already showing this exact vehicle and not currently transitioning, skip
      if (currentDisplayedCarId === nextCar.id && !isCarTransitioning && fleetMainImg && fleetMainImg.getAttribute('src')) {
        return;
      }

      // Always reset and cancel any in-flight transition to prevent stuck states
      resetCarVisualState();

      currentCarIndex = index;
      currentDisplayedCarId = nextCar.id;

      // Update counters
      if (fleetCounterCurr) fleetCounterCurr.textContent = String(index + 1).padStart(2, '0');
      if (fleetCounterTotal) fleetCounterTotal.textContent = String(cars.length).padStart(2, '0');

      if (!animate || !fleetCarCanvas || !fleetCarShadow) {
        if (fleetMainImg) {
          fleetMainImg.src = resolveAssetPath(nextCar.img);
          fleetMainImg.alt = (nextCar[currentLang] || nextCar.ar).name;
        }
        populateCarDetails(nextCar);
        updateActiveThumbnail();
        return;
      }

      isCarTransitioning = true;

      // 1. Prev car drives away down / forward in 3D
      fleetCarCanvas.classList.add('car-drive-away');
      fleetCarShadow.classList.add('shadow-drive-away');
      if (fleetColInfo) {
        fleetColInfo.style.opacity = '0';
        fleetColInfo.style.transform = 'translateY(6px)';
      }
      if (fleetColSpecs) {
        fleetColSpecs.style.opacity = '0';
        fleetColSpecs.style.transform = 'translateY(6px)';
      }

      transitionTimerPhase1 = setTimeout(() => {
        // Swap image and content
        if (fleetMainImg) {
          fleetMainImg.src = resolveAssetPath(nextCar.img);
          fleetMainImg.alt = (nextCar[currentLang] || nextCar.ar).name;
        }
        populateCarDetails(nextCar);
        updateActiveThumbnail();

        // 2. Prepare new car at distance in 3D (instant, no transition)
        fleetCarCanvas.classList.remove('car-drive-away');
        fleetCarCanvas.classList.add('car-drive-prepare');
        fleetCarShadow.classList.remove('shadow-drive-away');
        fleetCarShadow.classList.add('shadow-drive-prepare');

        // Force browser layout reflow
        void fleetCarCanvas.offsetWidth;

        // 3. Drive new car into center position with smooth 3D deceleration
        fleetCarCanvas.classList.remove('car-drive-prepare');
        fleetCarShadow.classList.remove('shadow-drive-prepare');

        if (fleetColInfo) {
          fleetColInfo.style.opacity = '1';
          fleetColInfo.style.transform = 'translateY(0)';
        }
        if (fleetColSpecs) {
          fleetColSpecs.style.opacity = '1';
          fleetColSpecs.style.transform = 'translateY(0)';
        }

        transitionTimerPhase2 = setTimeout(() => {
          isCarTransitioning = false;
          transitionTimerPhase2 = null;
        }, 380);
      }, 180);
    }

    // Category Switching
    function setFleetCategory(catName) {
      if (catName !== 'limousine' && catName !== 'rent') return;
      if (currentFleetCategory === catName) return;

      // Cleanly cancel any ongoing transition before switching categories
      resetCarVisualState();

      currentFleetCategory = catName;
      currentCarIndex = 0;

      if (catName === 'limousine') {
        if (fleetTabLimo) {
          fleetTabLimo.classList.add('active');
          fleetTabLimo.setAttribute('aria-selected', 'true');
        }
        if (fleetTabRent) {
          fleetTabRent.classList.remove('active');
          fleetTabRent.setAttribute('aria-selected', 'false');
        }
        if (fleetActiveBadgeText) {
          fleetActiveBadgeText.textContent = translations[currentLang].fleet_badge_limo;
        }
      } else {
        if (fleetTabRent) {
          fleetTabRent.classList.add('active');
          fleetTabRent.setAttribute('aria-selected', 'true');
        }
        if (fleetTabLimo) {
          fleetTabLimo.classList.remove('active');
          fleetTabLimo.setAttribute('aria-selected', 'false');
        }
        if (fleetActiveBadgeText) {
          fleetActiveBadgeText.textContent = translations[currentLang].fleet_badge_rent;
        }
      }

      renderFleetThumbnails();
      goToCar(0, true);
      pauseAutoplayTemporary(9000);

      if (typeof syncHeaderFleetTab === 'function') {
        syncHeaderFleetTab(catName);
      }
    }

    setFleetCategoryGlobal = setFleetCategory;

    if (fleetTabLimo) {
      fleetTabLimo.addEventListener('click', () => setFleetCategory('limousine'));
    }
    if (fleetTabRent) {
      fleetTabRent.addEventListener('click', () => setFleetCategory('rent'));
    }

    // Prev / Next Arrows
    if (fleetPrevBtn) {
      fleetPrevBtn.addEventListener('click', () => {
        pauseAutoplayTemporary(8000);
        goToCar(currentCarIndex - 1, true);
      });
    }
    if (fleetNextBtn) {
      fleetNextBtn.addEventListener('click', () => {
        pauseAutoplayTemporary(8000);
        goToCar(currentCarIndex + 1, true);
      });
    }

    // WhatsApp Action Button (Protected by rate-limiting guard, navigates natively)
    if (fleetWaBtn) {
      fleetWaBtn.addEventListener('click', (e) => {
        if (!checkRateLimit()) {
          e.preventDefault();
        }
      });
    }

    // Autoplay Controller
    function startAutoplay() {
      stopAutoplay();
      fleetAutoplayTimer = setInterval(() => {
        const cars = fleetCarsData[currentFleetCategory];
        const nextIndex = (currentCarIndex + 1) % cars.length;
        goToCar(nextIndex, true);
      }, 5000);
    }

    function stopAutoplay() {
      if (fleetAutoplayTimer) {
        clearInterval(fleetAutoplayTimer);
        fleetAutoplayTimer = null;
      }
    }

    function pauseAutoplayTemporary(ms = 8000) {
      stopAutoplay();
      if (fleetManualPauseTimer) clearTimeout(fleetManualPauseTimer);
      fleetManualPauseTimer = setTimeout(() => {
        fleetManualPauseTimer = null;
        startAutoplay();
      }, ms);
    }

    // Pause on hover
    fleetShowcaseCard.addEventListener('mouseenter', stopAutoplay);
    fleetShowcaseCard.addEventListener('mouseleave', () => {
      if (!fleetManualPauseTimer) {
        startAutoplay();
      }
    });

    // Touch swipe support for 3D car visual
    let touchStartX = 0;
    fleetShowcaseCard.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    fleetShowcaseCard.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diffX = touchEndX - touchStartX;
      if (Math.abs(diffX) > 45) {
        pauseAutoplayTemporary(8000);
        const isRtl = document.documentElement.dir === 'rtl';
        if (diffX > 0) {
          // Swiped right: in RTL that's next, in LTR that's prev
          goToCar(isRtl ? currentCarIndex + 1 : currentCarIndex - 1, true);
        } else {
          // Swiped left: in RTL that's prev, in LTR that's next
          goToCar(isRtl ? currentCarIndex - 1 : currentCarIndex + 1, true);
        }
      }
    }, { passive: true });

    // Handle Navbar Links with data-fleet-target
    document.querySelectorAll('[data-fleet-target]').forEach(link => {
      link.addEventListener('click', () => {
        const target = link.getAttribute('data-fleet-target');
        if (target) {
          setFleetCategory(target);
        }
      });
    });

    // Language Sync Callback
    updateFleetLanguage = function(lang) {
      if (fleetActiveBadgeText) {
        fleetActiveBadgeText.textContent = currentFleetCategory === 'limousine'
          ? translations[lang].fleet_badge_limo
          : translations[lang].fleet_badge_rent;
      }
      renderFleetThumbnails();
      const cars = fleetCarsData[currentFleetCategory];
      if (cars && cars[currentCarIndex]) {
        populateCarDetails(cars[currentCarIndex]);
      }
      updateFleetWhatsAppLink();
    };

    // Initial render
    renderFleetThumbnails();
    goToCar(0, false);
    startAutoplay();
  }

  // Initialize Language
  const initialLang = detectInitialLanguage();
  setLanguage(initialLang);
});
