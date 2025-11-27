// =========================================================
// PARTE 1: FUNCIONALIDAD DEL MODAL Y BARRA LATERAL
// =========================================================

const modal = document.getElementById("report-modal");
const btnAbrir = document.getElementById("open-report-modal");
const btnAbrirSidebar = document.getElementById("open-report-modal-sidebar");
const spanCerrar = document.querySelector(".close-btn");
const reportForm = document.getElementById('report-form');
const reportPhotoInput = document.getElementById('report-photo');
const photoNameSpan = document.getElementById('photo-name');

const sidebar = document.getElementById("sidebar");
const openSidebarBtn = document.getElementById("open-sidebar");
const closeSidebarBtn = document.querySelector(".close-sidebar");

// Elementos de Geolocalización
const locationChoiceBtns = document.querySelectorAll('.btn-location');
const manualCoordsContainer = document.getElementById('manual-coords-container');
const reportLatInput = document.getElementById('report-lat');
const reportLngInput = document.getElementById('report-lng');
const locationStatus = document.getElementById('location-status');

let currentCoords = { lat: null, lng: null }; // Almacenará las coordenadas finales (GPS o Manual)
let currentMode = 'gps'; // Modo por defecto

// 1. Manejo de la Barra Lateral
if (openSidebarBtn && closeSidebarBtn) {
    openSidebarBtn.onclick = function() {
        sidebar.classList.add('open');
    }
    closeSidebarBtn.onclick = function() {
        sidebar.classList.remove('open');
    }
    window.onclick = function(event) {
        if (event.target === sidebar) {
            sidebar.classList.remove('open');
        }
    }
}

// 2. Manejo del Modal
const openModal = function(e) {
    e.preventDefault();
    modal.style.display = "block";
    sidebar.classList.remove('open');
    // Cuando el modal se abre, intenta obtener la ubicación GPS por defecto
    if (currentMode === 'gps') {
        getGPSLocation();
    }
}

if (btnAbrir) btnAbrir.onclick = openModal;
if (btnAbrirSidebar) btnAbrirSidebar.onclick = openModal;

if (spanCerrar) {
    spanCerrar.onclick = function() {
        modal.style.display = "none";
    }
}
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// 3. Actualizar el nombre del archivo seleccionado
if (reportPhotoInput) {
    reportPhotoInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            photoNameSpan.textContent = 'Foto Adjunta: ' + this.files[0].name;
        } else {
            photoNameSpan.textContent = 'Adjuntar Foto (Opcional)';
        }
    });
}

// 4. Lógica de Selección de Modo (GPS vs Manual)
locationChoiceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        
        // Actualiza el estilo del botón
        locationChoiceBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentMode = mode;
        
        if (mode === 'manual') {
            // Activa campos manuales y desactiva GPS
            manualCoordsContainer.style.display = 'flex';
            reportLatInput.disabled = false;
            reportLngInput.disabled = false;
            locationStatus.textContent = 'Ubicación: Ingrese Latitud y Longitud manualmente.';
            locationStatus.className = 'status-gps';
        } else {
            // Desactiva campos manuales e intenta obtener GPS
            manualCoordsContainer.style.display = 'none';
            reportLatInput.disabled = true;
            reportLngInput.disabled = true;
            locationStatus.textContent = 'Ubicación: Usando GPS (Esperando permiso...)';
            locationStatus.className = 'status-gps';
            getGPSLocation();
        }
    });
});

// 5. Función de Geolocalización Real (GPS)
function getGPSLocation() {
    if (!navigator.geolocation) {
        locationStatus.textContent = 'Ubicación: El navegador no soporta geolocalización.';
        locationStatus.className = 'status-error';
        currentCoords.lat = null;
        currentCoords.lng = null;
        return;
    }
    
    // Pide la ubicación al navegador
    navigator.geolocation.getCurrentPosition(
        (position) => {
            // ÉXITO: Usuario dio permiso
            currentCoords.lat = position.coords.latitude;
            currentCoords.lng = position.coords.longitude;
            locationStatus.textContent = `Ubicación: Capturada (${currentCoords.lat.toFixed(4)}, ${currentCoords.lng.toFixed(4)})`;
            locationStatus.className = 'status-gps';
        },
        (error) => {
            // ERROR: Usuario denegó el permiso o hubo un fallo
            locationStatus.textContent = 'Ubicación: ERROR. Permiso denegado. ¡Cambie a modo Manual!';
            locationStatus.className = 'status-error';
            currentCoords.lat = null;
            currentCoords.lng = null;
            
            // Forzamos el cambio a manual si falla el GPS
            document.querySelector('.btn-location[data-mode="manual"]').click();
        }
    );
}


// =========================================================
// PARTE 2 & 3: MAPA (Leaflet) Y ENVÍO DE FORMULARIO
// =========================================================

const map = L.map('map-container').setView([20.67, -103.35], 5); 

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Iconos personalizados
const customIcon = (color) => new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const iconMap = {
    'Ambiente': customIcon('red'),
    'Desaparecido': customIcon('blue'),
    'DenunciaExterna': customIcon('green')
};

// Datos Fake de Incidentes (Iniciales)
const initialIncidents = [
    { lat: 19.43, lng: -99.13, type: 'Ambiente', desc: 'Descarga ilegal de residuos tóxicos.', anonimo: false },
    { lat: 25.68, lng: -100.31, type: 'Ambiente', desc: 'Humo denso y mala calidad del aire en zona industrial.', anonimo: true }, 
    { lat: 20.65, lng: -103.35, type: 'Desaparecido', desc: 'Se busca a persona desaparecida desde hace 48 horas.', anonimo: false }, 
    { lat: 20.96, lng: -89.62, type: 'DenunciaExterna', desc: 'Denuncia sobre abuso de autoridad en vía pública.', anonimo: true },
];

// Configuración de Filtros (Control de Capas de Leaflet)
const overlays = {
    "Contaminación/Riesgo Ambiental": L.layerGroup(),
    "Personas Desaparecidas": L.layerGroup(),
    "Otras Denuncias Ciudadanas": L.layerGroup()
};

function addIncidentToMap(incident) {
    const iconToUse = iconMap[incident.type];
    const marker = L.marker([incident.lat, incident.lng], { icon: iconToUse })
        .bindPopup(`
            <span style="font-weight: bold;">${incident.type}</span>
            <br>
            ${incident.desc}
            <br>
            <small>Reporte: ${incident.anonimo ? 'Anónimo' : 'Público'}</small>
        `);

    if (incident.type === 'Ambiente') {
        overlays["Contaminación/Riesgo Ambiental"].addLayer(marker);
    } else if (incident.type === 'Desaparecido') {
        overlays["Personas Desaparecidas"].addLayer(marker);
    } else if (incident.type === 'DenunciaExterna') {
        overlays["Otras Denuncias Ciudadanas"].addLayer(marker);
    }
    
    marker.addTo(map);
}

function addIncidentToForum(incident) {
    const list = document.getElementById('denuncias-list');
    const newDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    
    const newItem = document.createElement('div');
    newItem.className = 'denuncia-item';
    newItem.innerHTML = `
        <h4>${incident.title} (${newDate})</h4>
        <p>${incident.description.substring(0, 80)}...</p>
        <span class="denuncia-meta">Tipo: ${incident.type} | Nuevo Reporte</span>
    `;
    list.prepend(newItem);
}

initialIncidents.forEach(incident => addIncidentToMap(incident));
L.control.layers(null, overlays, { collapsed: false }).addTo(map);


// Lógica del envío del formulario (ACTUALIZADA)
if (reportForm) {
    reportForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        // 1. CAPTURAR DATOS
        const title = document.getElementById('report-title').value;
        const description = document.getElementById('report-description').value;
        const type = document.getElementById('report-type').value;
        const anonimo = document.getElementById('report-anonimo').checked;
        const fotoNombre = reportPhotoInput.files.length > 0 ? reportPhotoInput.files[0].name : 'Ninguna';
        
        let finalLat, finalLng;

        // 2. OBTENER COORDENADAS SEGÚN EL MODO
        if (currentMode === 'manual') {
            finalLat = parseFloat(reportLatInput.value);
            finalLng = parseFloat(reportLngInput.value);
            
            // Validación básica para coordenadas manuales
            if (isNaN(finalLat) || isNaN(finalLng) || finalLat === 0 || finalLng === 0) {
                alert("Por favor, ingrese coordenadas Latitud y Longitud válidas y no nulas.");
                return;
            }

        } else if (currentMode === 'gps') {
            finalLat = currentCoords.lat;
            finalLng = currentCoords.lng;

            // Validación para GPS
            if (finalLat === null || finalLng === null) {
                alert("Por favor, espere a que el GPS capture su ubicación o cambie a modo Manual.");
                return;
            }
        }

        const newIncidentData = {
            title: title,
            description: description,
            type: type,
            anonimo: anonimo,
            lat: finalLat, // Coordenada real/manual
            lng: finalLng
        };

        // 3. AÑADIR AL MAPA Y AL FORO INMEDIATAMENTE
        addIncidentToMap(newIncidentData);
        addIncidentToForum(newIncidentData);
        
        // Mueve el mapa a la nueva ubicación para centrar la atención
        map.setView([finalLat, finalLng], 10);

        const formContent = document.querySelector('#report-modal .modal-content');
        
        // 4. MOSTRAR MENSAJE DE ÉXITO
        formContent.innerHTML = `
            <h3>¡Reporte Enviado y Publicado!</h3>
            <p>Tu reporte ha sido geolocalizado en (${finalLat.toFixed(4)}, ${finalLng.toFixed(4)}) y añadido al mapa.</p>
            <p>Se ha guardado de forma ${anonimo ? 'Anónima' : 'Pública'}.</p>
            <p><a href="#comunidad-section" onclick="modal.style.display='none';">Ver en el Foro de Denuncias</a></p>
        `;
        
        // Cierra automáticamente después de 6 segundos y recarga para limpiar el formulario
        setTimeout(() => {
            modal.style.display = "none";
            location.reload(); 
        }, 6000);
    });
}

// Inicializa el modo GPS al cargar
getGPSLocation();