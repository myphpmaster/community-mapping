/**
 * This file is licensed under Creative Commons Zero (CC0)
 * https://creativecommons.org/publicdomain/zero/1.0/
 *
 * Author: https://www.openstreetmap.org/user/Zartbitter
 */

var map;

/**
 * Add or replace a parameter (with value) in the given URL.
 * By Adil Malik, https://stackoverflow.com/questions/1090948/change-url-parameters/10997390#10997390
 * @param String url the URL
 * @param String param the parameter
 * @param String paramVal the value of the parameter
 * @return String the changed URL
 */
function updateURLParameter(url, param, paramVal) {
	var theAnchor = null;
	var newAdditionalURL = "";
	var tempArray = url.split("?");
	var baseURL = tempArray[0];
	var additionalURL = tempArray[1];
	var temp = "";

	if (additionalURL) {
		var tmpAnchor = additionalURL.split("#");
		var theParams = tmpAnchor[0];
		theAnchor = tmpAnchor[1];
		if(theAnchor) {
			additionalURL = theParams;
		}

		tempArray = additionalURL.split("&");

		for (i=0; i<tempArray.length; i++) {
			if(tempArray[i].split('=')[0] != param) {
				newAdditionalURL += temp + tempArray[i];
				temp = "&";
			}
		}        
	} else {
		var tmpAnchor = baseURL.split("#");
		var theParams = tmpAnchor[0];
		theAnchor  = tmpAnchor[1];

		if(theParams) {
			baseURL = theParams;
		}
	}

	if(theAnchor) {
		paramVal += "#" + theAnchor;
	}

	var rows_txt = temp + "" + param + "=" + paramVal;
	return baseURL + "?" + newAdditionalURL + rows_txt;
}

/**
 * Add or replace the language parameter of the URL and reload the page.
 * @param String id of the language
 */
function changeLanguage(pLang) {
	window.location.href = updateURLParameter(window.location.href, 'lang', pLang);
}

/**
 * Get all parameters out of the URL.
 * @return Array List of URL parameters key-value indexed
 */
function getUrlParameters() {
	var vars = [], hash;
	var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
	for(var i=0; i<hashes.length; i++) {
		hash = hashes[i].split('=');
		vars.push(hash[0]);
		vars[hash[0]] = hash[1];
	}
	return vars;
}

/**
 * Callback for successful geolocation.
 * @var position Geolocated position
 */
function foundLocation(position) {
	if (typeof map != "undefined") {
		var lat = position.coords.latitude;
		var lon = position.coords.longitude;
		map.setView(new L.LatLng(lat, lon), 11);
	}
}

/**
 * Example function to replace leaflet-openweathermap's builtin marker by a wind rose symbol.
 * Some helper functions and an event listener are needed, too. See below.
 */
function myWindroseMarker(data) {
	var content = '<canvas id="id_' + data.id + '" width="50" height="50"></canvas>';
	var icon = L.divIcon({html: content, iconSize: [50,50], className: 'owm-div-windrose'});
	return L.marker([data.coord.Lat, data.coord.Lon], {icon: icon, clickable: false});
}

/**
 * Helper function for replacing leaflet-openweathermap's builtin marker by a wind rose symbol.
 * This function draws the canvas of one marker symbol once it is available in the DOM.
 */
function myWindroseDrawCanvas(data, owm) {

	var canvas = document.getElementById('id_' + data.id);
	canvas.title = data.name;
	var angle = 0;
	var speed = 0;
	var gust = 0;
	if (typeof data.wind != 'undefined') {
		if (typeof data.wind.speed != 'undefined') {
			canvas.title += ', ' + data.wind.speed + ' m/s';
			canvas.title += ', ' + owm._windMsToBft(data.wind.speed) + ' BFT';
			speed = data.wind.speed;
		}
		if (typeof data.wind.deg != 'undefined') {
			//canvas.title += ', ' + data.wind.deg + '°';
			canvas.title += ', ' + owm._directions[(data.wind.deg/22.5).toFixed(0)];
			angle = data.wind.deg;
		}
		if (typeof data.wind.gust != 'undefined') {
			gust = data.wind.gust;
		}
	}
	if (canvas.getContext && speed > 0) {
		var red = 0;
		var green = 0;
		if (speed <= 10) {
			green = 10*speed+155;
			red = 255*speed/10.0;
		} else {
			red = 255;
			green = 255-(255*(Math.min(speed, 21)-10)/11.0);
		}
		var ctx = canvas.getContext('2d');
		ctx.translate(25, 25);
		ctx.rotate(angle*Math.PI/180);
		ctx.fillStyle = 'rgb(' + Math.floor(red) + ',' + Math.floor(green) + ',' + 0 + ')';
		ctx.beginPath();
		ctx.moveTo(-15, -25);
		ctx.lineTo(0, -10);
		ctx.lineTo(15, -25);
		ctx.lineTo(0, 25);
		ctx.fill();

		// draw inner arrow for gust
		if (gust > 0 && gust != speed) {
			if (gust <= 10) {
				green = 10*gust+155;
				red = 255*gust/10.0;
			} else {
				red = 255;
				green = 255-(255*(Math.min(gust, 21)-10)/11.0);
			}
			canvas.title += ', gust ' + data.wind.gust + ' m/s';
			canvas.title += ', ' + owm._windMsToBft(data.wind.gust) + ' BFT';
			ctx.fillStyle = 'rgb(' + Math.floor(red) + ',' + Math.floor(green) + ',' + 0 + ')';
			ctx.beginPath();
			ctx.moveTo(-15, -25);
			ctx.lineTo(0, -10);
			//ctx.lineTo(15, -25);
			ctx.lineTo(0, 25);
			ctx.fill();
		}
	} else {
		canvas.innerHTML = '<div>'
				+ (typeof data.wind != 'undefined' && typeof data.wind.deg != 'undefined' ? data.wind.deg + '°' : '')
				+ '</div>';
	}
}

/**
 * Helper function for replacing leaflet-openweathermap's builtin marker by a wind rose symbol.
 * This function is called event-driven when the layer and its markers are added. Now we can draw all marker symbols.
 * The this-context has to be the windrose layer.
 */
function windroseAdded(e) {
	for (var i in this._markers) {
		var m = this._markers[i];
		var cv = document.getElementById('id_' + m.options.owmId);
		for (var j in this._cache._cachedData.list) {
			var station = this._cache._cachedData.list[j];
			if (station.id == m.options.owmId) {
				myWindroseDrawCanvas(station, this);
			}
		}
	}
}

/**
 * Example function to replace leaflet-openweathermap's builtin marker.
 */
function myOwmMarker(data) {
	// just a Leaflet default marker
	return L.marker([data.coord.Lat, data.coord.Lon]);
}

/**
 * Example function to replace leaflet-openweathermap's builtin popup.
 */
function myOwmPopup(data) {
	// just a Leaflet default popup
	return L.popup().setContent(typeof data.name != 'undefined' ? data.name : data.id);
}

/**
 * Toggle scroll wheel behaviour.
 */
function toggleWheel(localLang) {
	if (map.scrollWheelZoom._enabled) {
		map.scrollWheelZoom.disable();
		document.getElementById('wheelimg').src = 'files/ScrollWheelDisabled20.png';
		document.getElementById('wheeltxt').innerHTML = getI18n('scrollwheel', localLang) + ' ' + getI18n('off', localLang);
	} else {
		map.scrollWheelZoom.enable();
		document.getElementById('wheelimg').src = 'files/ScrollWheel20.png';
		document.getElementById('wheeltxt').innerHTML = getI18n('scrollwheel', localLang) + ' ' + getI18n('on', localLang);
	}
}

/**
 * Initialize the map.
 */
async function initMap() {

	var standard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
		});

	var humanitarian = L.tileLayer('https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
		maxZoom: 17,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors</a> <a href="https://www.hotosm.org/" target="_blank">Tiles courtesy of Humanitarian OpenStreetMap Team</a>'
		});

	var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
		maxZoom: 19,
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		});

	var esri = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}.jpg", {
		maxZoom: 19, attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
	});

	// Get your own free OWM API key at https://www.openweathermap.org/appid - please do not re-use mine!
	// You don't need an API key for this to work at the moment, but this will change eventually.
	var OWM_API_KEY = '06aac0fd4ba239a20d824ef89602f311';

	var clouds = L.OWM.clouds({opacity: 0.8, legendImagePath: 'files/NT2.png', appId: OWM_API_KEY});
	var cloudscls = L.OWM.cloudsClassic({opacity: 0.5, appId: OWM_API_KEY});
	var precipitation = L.OWM.precipitation( {opacity: 0.5, appId: OWM_API_KEY} );
	var precipitationcls = L.OWM.precipitationClassic({opacity: 0.5, appId: OWM_API_KEY});
	var rain = L.OWM.rain({opacity: 0.5, appId: OWM_API_KEY});
	var raincls = L.OWM.rainClassic({opacity: 0.5, appId: OWM_API_KEY});
	var snow = L.OWM.snow({opacity: 0.5, appId: OWM_API_KEY});
	var pressure = L.OWM.pressure({opacity: 0.4, appId: OWM_API_KEY});
	var pressurecntr = L.OWM.pressureContour({opacity: 0.5, appId: OWM_API_KEY});
	var temp = L.OWM.temperature({opacity: 0.5, appId: OWM_API_KEY});
	var wind = L.OWM.wind({opacity: 0.5, appId: OWM_API_KEY});

	var localLang = getLocalLanguage();

	var city = L.OWM.current({intervall: 15, imageLoadingUrl: 'leaflet/owmloading.gif', lang: localLang, minZoom: 5,
			appId: OWM_API_KEY});
	var windrose = L.OWM.current({intervall: 15, imageLoadingUrl: 'leaflet/owmloading.gif', lang: localLang, minZoom: 4,
			appId: OWM_API_KEY, markerFunction: myWindroseMarker, popup: false, clusterSize: 50,
   			imageLoadingBgUrl: 'https://openweathermap.org/img/w0/iwind.png' });
	windrose.on('owmlayeradd', windroseAdded, windrose); // Add an event listener to get informed when windrose layer is ready

	var useGeolocation = false;
	var zoom = 7;
	var lat = 4.138;
	var lon = 102.096;
	var urlParams = getUrlParameters();
	if (typeof urlParams.zoom != "undefined" && typeof urlParams.lat != "undefined" && typeof urlParams.lon != "undefined") {
		zoom = urlParams.zoom;
		lat = urlParams.lat;
		lon = urlParams.lon;
		useGeolocation = false;
	}

	map = L.map('map', {
		center: new L.LatLng(lat, lon), zoom: zoom,
		layers: [standard]
	});
	map.attributionControl.setPrefix("");

	map.addControl(L.languageSelector({
		languages: new Array(
			L.langObject('en', 'English', 'mapicons/en.png')
		,	L.langObject('de', 'Deutsch', 'mapicons/de.png')
		,	L.langObject('fr', 'Français', 'mapicons/fr.png')
		,	L.langObject('it', 'Italiano', 'mapicons/it.png')
		,	L.langObject('es', 'Español', 'mapicons/es.png')
		,	L.langObject('ca', 'Català', 'mapicons/catalonia.png')
		,	L.langObject('ru', 'Русский', 'mapicons/ru.png')
		,	L.langObject('nl', 'Nederlands', 'mapicons/nl.png')
		,	L.langObject('pt_br', 'Português do Brasil', 'mapicons/br.png')
		),
		callback: changeLanguage,
		initialLanguage: localLang,
		hideSelected: false,
		vertical: false
	}));

	var baseMaps = {
		"Standard": standard
		, "Humanitarian": humanitarian
		, "Satellite": satellite
	//	, "ESRI Aerial": esri
	};

	var overlayMaps = {};
	overlayMaps[getI18n('city', localLang)] = city;
	overlayMaps[getI18n('clouds', localLang)] = clouds;
	// overlayMaps[getI18n('cloudscls', localLang)] = cloudscls;
	overlayMaps[getI18n('precipitation', localLang)] = precipitation;
	// overlayMaps[getI18n('precipitationcls', localLang)] = precipitationcls;
	overlayMaps[getI18n('rain', localLang)] = rain;
	// overlayMaps[getI18n('raincls', localLang)] = raincls;
	// overlayMaps[getI18n('snow', localLang)] = snow;
	overlayMaps[getI18n('temp', localLang)] = temp;
	overlayMaps[getI18n('windspeed', localLang)] = wind;
	overlayMaps[getI18n('pressure', localLang)] = pressure;
	// overlayMaps[getI18n('presscont', localLang)] = pressurecntr;
	overlayMaps[getI18n('windrose', localLang)] = windrose;
	// overlayMaps[getI18n('flood', localLang)] = flood;

	var layerControl = L.control.layers(baseMaps, overlayMaps, {collapsed: false}).addTo(map);

	map.addControl(new L.Control.Permalink({layers: layerControl, useAnchor: false, position: 'bottomright'}));

	/**
	 * Coastal Erosion menu
	 */
	var erosion = await loadErosion(); 
	layerControl.addOverlay(erosion, "Coastal Erosion");

	// zoom-in when marker is clicked
	erosion.on('click', function(e) {
		map.setView(e.latlng, 9);  		
  	});
	

	/**
	 * Water Level menu
	 */
	var water_level = await loadWaterLevel();
	layerControl.addOverlay(water_level, "Rising Sea Levels");

	water_level.on('click', function(e) {
		map.setView(e.latlng, 7);      
  	});

	/**
	 * Flooding menu
	 */
	var flooding = await loadFlooding();
	layerControl.addOverlay(flooding, "Increased Flooding");

	flooding.on('click', function(e) {
		map.setView(e.latlng, 8);      
  	});

	// patch layerControl to add some titles
	var patch = L.DomUtil.create('div', 'owm-layercontrol-header');
	patch.innerHTML = getI18n('layers', localLang); // 'Forecast Weather';
	layerControl._form.children[2].parentNode.insertBefore(patch, layerControl._form.children[2]);

	patch = L.DomUtil.create('div', 'leaflet-control-layers-separator');
	layerControl._form.children[3].children[0].parentNode.insertBefore(patch, layerControl._form.children[3].children[layerControl._form.children[3].children.length-3]);

	patch = L.DomUtil.create('div', 'owm-layercontrol-header color-blue');
	patch.innerHTML = getI18n('focus', localLang); // 'Project Focus';
	layerControl._form.children[3].children[0].parentNode.insertBefore(patch, layerControl._form.children[3].children[layerControl._form.children[3].children.length-3]);

	patch = L.DomUtil.create('div', 'owm-layercontrol-header');
	patch.innerHTML = getI18n('maps', localLang); // 'Maps';
	layerControl._form.children[0].parentNode.insertBefore(patch, layerControl._form.children[0]);

	patch = L.DomUtil.create('div', 'leaflet-control-layers-separator');
	layerControl._form.children[0].parentNode.insertBefore(patch, null);

	patch = L.DomUtil.create('div', 'owm-layercontrol-header');
	patch.innerHTML = getI18n('prefs', localLang); // 'Preferences';
	layerControl._form.children[0].parentNode.insertBefore(patch, null);

	patch = L.DomUtil.create('div', '');
	patch.innerHTML = '<div id="wheeldiv" onClick="toggleWheel(\'' + localLang + '\')"><img id="wheelimg" src="files/ScrollWheel20.png" align="middle" > <span id="wheeltxt">' + getI18n('scrollwheel', localLang) + ' ' + getI18n('on', localLang) + '</span></div>';
	layerControl._form.children[0].parentNode.insertBefore(patch, null);

	if (useGeolocation && typeof navigator.geolocation != "undefined") {
		navigator.geolocation.getCurrentPosition(foundLocation);
	}

}

async function loadErosion() {
	try {
	  const response = await fetch('./json/erosion.geojson');
	  if (!response.ok) {
		throw new Error('Failed to load GeoJSON data');
	  }
	  const data = await response.json();
	  var getpoints = L.geoJSON(data, {
		markersInheritOptions: true,
		onEachFeature: function (feature, layer) {
			var content;
			var id = 0;

			if(feature.properties.name){
				content = '<h3>' + feature.properties.name + '</h3>';
			}

			if(feature.properties.text && feature.properties.img){

				/* Tab Content start here
				*/
				content += '<div class="tabx">';
				content += '<button class="tablinks active" onclick="openTab(event, \'tab-1\')">Image</button>';
				content += '<button class="tablinks" onclick="openTab(event, \'tab-2\')">Information</button>';
				content += '</div>';

				// tab 1 - image content
				content += '<div id="tab-1" class="tabcontent" style="display: block;">';
				content += '<p><img src="' + feature.properties.img + '" width="100%" height="auto;"/></p>';
				content += '</div>';
				
				// tab2 - text content
				content += '<div id="tab-2" class="tabcontent">';
								
				if(feature.properties.title){
					content += '<strong>' + feature.properties.title + '</strong><br/>';
				} else {
					content += '<strong>Coastal Erosion</strong><br/>';
				}

				content += '<p>' + feature.properties.text + '</p>';

				if(feature.properties.link){
					content += '<p><a href="' + feature.properties.link + '" target="_blank">Read more</a></p>';
				}

				content += '</div>';
				/* Tab Content end here
				*/
			} else {
				
				if(feature.properties.title){
					content += '<strong>' + feature.properties.title + '</strong><br/>';
				} else {
					content += '<strong>Coastal Erosion</strong><br/>';
				}
				if(feature.properties.text){
					content += '<p>' + feature.properties.text + '</p>';
				}
				if(feature.properties.link){
					content += '<p><a href="' + feature.properties.link + '" target="_blank">Read more</a></p>';
				}
				if(feature.properties.img){
					content += '<p><img src="' + feature.properties.img + '" width="100%" height="auto;"/></p>';
				}	

			}
			layer.bindPopup(content, {
				className: "erosion-popup",
				maxWidth: "auto"
			});	
			id++;	
		},
		pointToLayer: erosionIcon
	});
	  return getpoints;
	} catch (error) {
	  console.error(error);
	}
}

async function loadWaterLevel() {
	try {
	  const response = await fetch('./json/water_level.geojson');
	  if (!response.ok) {
		throw new Error('Failed to load GeoJSON data');
	  }
	  const data = await response.json();
	  var getpoints = L.geoJSON(data, {
		style: function (feature) {
			return feature.properties.style;
		},
		onEachFeature: function (feature, layer) {
			var content
			if(feature.properties.name){
				content = '<h3>' + feature.properties.name + '</h3>';
			}
			if(feature.properties.text){
				content += '<strong>Sea Level Projection RCP8.5</strong><br/>';
				content += '<p>' + feature.properties.text + '</p>';
				content += '<p>* Datum: Land Survey Datum (LSD)<br/>** Unit measurement in meter</p>';
				content += '<p><strong><em>Source: <a href="https://mycoast.nahrim.gov.my/portal-main/photo-gallery-details?id=sealevelrise_malaysia" target="_blank">NAHRIM</a></em></strong></p>';
			}
			if(feature.properties.link){
				content += '<p><a href="' + feature.properties.link + '" target="_blank">Read more</a></p>';
			}
			layer.bindPopup(content);
		},
		pointToLayer: waterIcon
	});
	  return getpoints;
	} catch (error) {
	  console.error(error);
	}
}

async function loadFlooding() {
	try {
	  const response = await fetch('./json/flood.geojson');
	  if (!response.ok) {
		throw new Error('Failed to load GeoJSON data');
	  }
	  const data = await response.json();
	  var getpoints = L.geoJSON(data, {
		style: {color: "red"},
		onEachFeature: function (feature, layer) {
			var content;

			if(feature.properties.name){
				content = '<h3>' + feature.properties.name + '</h3>';
			}

			if(feature.properties.text && feature.properties.img){

				/* Tab Content start here
				*/
				content += '<div class="tabx">';
				content += '<button class="tablinks active" onclick="openTab(event, \'tab-1\')">Image</button>';
				content += '<button class="tablinks" onclick="openTab(event, \'tab-2\')">Information</button>';
				content += '</div>';

				// tab 1 - image content
				content += '<div id="tab-1" class="tabcontent" style="display: block;">';
				content += '<p><img src="' + feature.properties.img + '" width="100%" height="auto;"/></p>';
				content += '</div>';
				
				// tab2 - text content
				content += '<div id="tab-2" class="tabcontent">';
								
				if(feature.properties.title){
					content += '<strong>' + feature.properties.title + '</strong><br/>';
				} else {
					content += '<strong>Increased Flooding</strong><br/>';
				}

				content += '<p>' + feature.properties.text + '</p>';

				if(feature.properties.link){
					content += '<p><a href="' + feature.properties.link + '" target="_blank">Click here</a> to view current water level. <br/><br/><strong><em>Source: Public Infobanjir.</em></strong></p>';
				}

				content += '</div>';
				/* Tab Content end here
				*/
				
			} else {
				
				if(feature.properties.title){
					content += '<strong>' + feature.properties.title + '</strong><br/>';
				} else {
					content += '<strong>Increased Flooding</strong><br/>';
				}
				if(feature.properties.text){
					content += '<p>' + feature.properties.text + '</p>';
				}
				if(feature.properties.link){
					content += '<p><a href="' + feature.properties.link + '" target="_blank">Read more</a></p>';
				}
				if(feature.properties.img){
					content += '<p><img src="' + feature.properties.img + '" width="100%" height="auto;"/></p>';
				}	

			}
			layer.bindPopup(content, {
				className: "flooding-popup",
				maxWidth: "auto"
			});	
		},
		pointToLayer: upIcon
	});
	  return getpoints;
	} catch (error) {
	  console.error(error);
	}
}

/*
* iconEX
* Replace Leaflet's default blue marker with a custom icon
* https://github.com/mfhsieh/leaflet-iconex
*/
function waterIcon (feature, latlng) {
	const iconEX = new L.IconEx({
		contentHtml: `<i class="fas fa-water"></i>`,
		iconFill: "#00c",
		contentColor: "#00c",
	});
	return L.marker(latlng, { icon: iconEX })
}

function upIcon (feature, latlng) {
	const iconEX = new L.IconEx({
		contentHtml: `<i class="fas fa-arrow-up"></i>`,
		iconFill: "#ff1a1a",
		contentColor: "#ff1a1a",
	});
	return L.marker(latlng, { icon: iconEX })
}

function erosionIcon (feature, latlng) {
	const iconEX = new L.IconEx({
		// square
		iconHtml: `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
<path stroke-width="1" d="m 2.5,0.5 c -1.107998,0 -2,0.892002 -2,2 v 27 c 0,1.107998 0.892002,2 2,2 h 4.7044922 a 4.1676656,4.1676656 24.095192 0 1 3.1064288,1.38926 L 16,39.25 21.68908,32.88926 A 4.1676657,4.1676657 155.90481 0 1 24.795508,31.5 H 29.5 c 1.107998,0 2,-0.892002 2,-2 v -27 c 0,-1.107998 -0.892002,-2 -2,-2 z" />
</svg>`,
		backgroundHtml: `
<svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
<path stroke-width="0" d="M 5.5483871,4 C 4.6905822,4 4,4.6905822 4,5.5483871 V 26.451613 C 4,27.309418 4.6905822,28 5.5483871,28 h 3.6421875 a 3.2265798,3.2265798 0 0 1 2.4049774,1.075556 L 16,34 20.404449,29.075556 A 3.2265799,3.2265799 0 0 1 22.809426,28 h 3.642187 C 27.309418,28 28,27.309418 28,26.451613 V 5.5483871 C 28,4.6905822 27.309418,4 26.451613,4 Z" />
</svg>`,
		backgroundHtmlSize: [32, 40],
		backgroundHtmlAnchor: [16, 20],
		contentFontSize: 18,
		contentHtml: `<i class="fas fa-wind"></i>`,
		iconFill: "#a1a",
	});
	return L.marker(latlng, { icon: iconEX })
}

/*
https://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_tabs

Tabs function
*/

function openTab(evt, id) {
	var i, tabcontent, tablinks;
	tabcontent = document.getElementsByClassName("tabcontent");
	for (i = 0; i < tabcontent.length; i++) {
	  tabcontent[i].style.display = "none";
	}
	tablinks = document.getElementsByClassName("tablinks");
	for (i = 0; i < tablinks.length; i++) {
	  tablinks[i].className = tablinks[i].className.replace(" active", "");
	}
	document.getElementById(id).style.display = "block";
	evt.currentTarget.className += " active";
  }