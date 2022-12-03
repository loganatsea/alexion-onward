var mainIcon = "/images/icon-blue-location.svg", 
    selectIcon = "/images/icon-location-selected.svg", 
    phoneIcon = "/images/icon-phone.png", 
    directionsIcon = "/images/icon-directions.svg", 
    initZoom = 4, 
    initLat = 39.8097343, 
    initLng = -98.5556199, 
    mapStyles = [{
        featureType: "administrative",
        elementType: "geometry",
        stylers: [{
            visibility: "off"
        }]
    }, {
        featureType: "poi",
        stylers: [{
            visibility: "off"
        }]
    }, {
        featureType: "road",
        elementType: "labels.icon",
        stylers: [{
            visibility: "off"
        }]
    }, {
        featureType: "transit",
        stylers: [{
            visibility: "off"
        }]
    }],
    $addressInput,
    $rad, 
    $lat, 
    $lng, 
    $map, 
    $poiMarkers = [],
    query,
    $totalEntries, 
    $entries,
    $entriesShowing,
    $entriesList,
    $noEntries,
    $introText,
    $locationResults, 
    $maxEntriesPerLoad = 25;

// Initialize and add the map
function initMap() {
    $map = new google.maps.Map(document.getElementById("map"), {
        center: {
            lat: initLat,
            lng: initLng
        },
        zoom: 4,
        styles: mapStyles,
        disableDefaultUI: !0,
        zoomControl: !0
    });
    initAutocomplete();
  }
  
function manuallyRunAutocompleteSearch() {
    (new google.maps.places.AutocompleteService).getPlacePredictions({
        input: $addressInput.value,
        offset: $addressInput.value.length,
        componentRestrictions: {
            country: "us"
        }
    }, function e(predictions, state) {
        null == predictions || 0 == predictions.length ? failedQuery() : new google.maps.places.PlacesService(document.getElementById("placesContainer")).getDetails({
            reference: predictions[0].reference
        }, function e(location, t) {
            $addressInput.value = location.formatted_address,
            $lat = location.geometry.location.lat(),
            $lng = location.geometry.location.lng(),
            newSearch()
        })
    })
}

function initAutocomplete() {
    var autocomplete = new google.maps.places.Autocomplete($addressInput);
    autocomplete.setComponentRestrictions({
        country: ["us"]
    }),
    autocomplete.addListener("place_changed", function() {
        var place = autocomplete.getPlace();
        if (!place.geometry)
            return void failedQuery();
        $lat = place.geometry.location.lat(),
        $lng = place.geometry.location.lng()
        newSearch();
    })
}
function newAPIQuery(lat, lng) {
    query = "";
    var apiUrl = $entries.dataset.service
      , dataParam = {
        Latitude: lat,
        Longitude: lng,
        Radius: 50,
        ResultCount: 25
    };
    query = $.ajax({
        async: !1,
        data: dataParam,
        url: apiUrl,
        type: "GET",
        dataType: "json"
    }).responseJSON,
    $totalEntries = query.locations.length,
    $entriesShowing = $maxEntriesPerLoad < $totalEntries ? $maxEntriesPerLoad : $totalEntries
}

function newSearch() {
    $lat && $lng ? ($map.panTo(new google.maps.LatLng($lat, $lng),
    $map.setZoom(10)),
    newAPIQuery($lat, $lng),
    clearMap(),
    clearEntryIndex(),
    (query && 0 < query.locations.length ? successfulQuery : failedQuery)()) : failedQuery()
}

function clearMap() {
    for (var e = 0; e < $poiMarkers.length; e++)
        $poiMarkers[e].setMap(null);
    $poiMarkers = [] 
}

function successfulQuery() {
    displayEntryIndex(),
    loadPoints()
    $locationResults.classList.remove("hidden"),
    $noEntries.classList.add("hidden")
}

function failedQuery() {
    clearMap(),
    clearEntryIndex(),
    $locationResults.classList.add("hidden"),
    $noEntries.classList.remove("hidden") 
}

function clearEntryIndex() {
    $entriesList.innerHTML = "",
    $introText.classList.add("hidden")
}

function loadPoints() {
    if (query && 1 <= query.locations.length) {
        for (var i = 0; i < $entriesShowing; i++)
            addMarker(query.locations[i],i.toString());
        for (var marker = new google.maps.LatLngBounds, i = 0; i < $poiMarkers.length; i++)
            marker.extend($poiMarkers[i].getPosition());
        $map.fitBounds(marker)
    }
}

function addMarker(data,i) {
    var marker = new google.maps.Marker({
        position: new google.maps.LatLng(data.location.Latitude,data.location.Longitude),
        icon: mainIcon,
        map: $map,
        id: i,
        title: data.location.Name
    });
    google.maps.event.addListener(marker, "click", function() {
        for (var e = 0; e < $poiMarkers.length; e++)
            $poiMarkers[e].setIcon(mainIcon);
        this.setIcon(selectIcon),
        highlightIndexEntry(this.id),
        highlightMapPoint(this.id)
    }),
    $poiMarkers.push(marker)
}

function displayEntryIndex() {
    if (query && 1 <= query.locations.length) {
        for (var i = 0; i < $entriesShowing; i++) {
            $entriesList.appendChild(createIndexItem(query.locations[i], i));
            $entriesList.appendChild(document.createElement("hr"));
        }
        for (var entry = document.getElementsByClassName("accordion-item"), i = 0; i < entry.length; i++)
            entry[i].addEventListener("click", function(e) {
                highlightIndexEntry(this.dataset.id),
                highlightMapPoint(this.dataset.id)
            })
    }
}

function loadMoreEntryIndex() {
    var entriesToLoad;
    if ($entriesShowing < $totalEntries) {
        for (var entriesRemaining = $totalEntries - $entriesShowing, entriesToLoad = ($maxEntriesPerLoad < entriesRemaining ? $maxEntriesPerLoad : entriesRemaining), _entriesShowing = $entriesShowing; _entriesShowing < $entriesShowing + entriesToLoad; _entriesShowing++) {
            $entriesList.appendChild(createIndexItem(query.locations[_entriesShowing], _entriesShowing));
            $entriesList.appendChild(document.createElement("hr"));
        }
        for (var entry = document.getElementsByClassName("accordion-item"), _entriesShowing = $entriesShowing; _entriesShowing < $entriesShowing + entriesToLoad; _entriesShowing++)
            entry[_entriesShowing].addEventListener("click", function(e) {
                highlightIndexEntry(this.dataset.id),
                highlightMapPoint(this.dataset.id)
            });
        loadMoreMapPoints(entriesToLoad),
        $entriesShowing += entriesToLoad
    }
}

function loadMoreMapPoints(entriesToLoad) {
    for (var i = $entriesShowing; i < $entriesShowing + entriesToLoad; i++)
        addMarker(query.locations[i],i);
    for (var j = new google.maps.LatLngBounds, n = 0; n < $poiMarkers.length; n++)
        j.extend($poiMarkers[n].getPosition());
    $map.fitBounds(j)
}

function highlightIndexEntry(data) {
    for (var entry = document.getElementsByClassName("accordion-item"), i = 0; i < entry.length; i++)
        entry[i].classList.remove("active");
    var selected = document.querySelector(".accordion-item[data-id='" + data + "']");
    selected.classList.add("active"),
    selected.scrollIntoView({
        behavior: 'smooth'
      });
}
function highlightMapPoint(data) {
    for (var i = 0; i < $poiMarkers.length; i++)
        $poiMarkers[i].setIcon(mainIcon);
    var index = $poiMarkers.findIndex(function(point) {
        return point.id === parseInt(data)
    });
    $poiMarkers[index].setIcon(selectIcon);
}

function createIndexItem(data, count) {
    var locationData = data.location
      , entryHtml = document.createElement("div");
    entryHtml.className = "accordion-item location",
    0 === count && (entryHtml.className = "accordion-item location active"),
    entryHtml.setAttribute("data-id", count),
    entryHtml.innerHTML += '<h2 id="heading-' + count + '" class="accordion-header"><button class="accordion-button" type="button" aria-expanded="false"><p id="siteAccount"><strong>' + (locationData.Name? locationData.Name : locationData.City + " Center - " + locationData.PostalCode) + "</strong></p></button></h2>"+
                            (locationData.AddressLine ? '<p id="siteAccountStreetAddress">' + locationData.AddressLine1 + '</p>' : "<p></p>") +
                            '<div aria-labelledby="heading-'+ count +'" class="accordion-collapse ">'+
                                '<div class="accordion-body">'+
                                    (locationData.City ? '<p> <span id="siteAccountCity">' + locationData.City + '</span>, ' : "" ) +
                                    (locationData.Region ? '<span id="siteAccountProvState">' + locationData.Region + '</span>' : "") +
                                    (locationData.PostalCode ? '<span id="siteAccountPostalCode"> ' + locationData.PostalCode + '</span>': "") +
                                    '</p>'+
                                    (locationData.Phone ? '<p id="siteAccountMainPhone"><a href="tel:' + locationData.Phone + '"><img src="' + phoneIcon + '" />' + formatPhone(locationData.Phone) + '</a></p>': "")+
                                    '<p id="siteAccountDirections"><a href="http://maps.google.com/maps?daddr=' + (locationData.AddressLine ? locationData.AddressLine : "") + " " + (locationData.City ? locationData.City : "") + " " + (locationData.Region ? locationData.Region : "") + " " + (locationData.PostalCode ? locationData.PostalCode : "") + "&saddr=" + $lat + ", " + $lng + '" target="_blank"><img src="'+ directionsIcon+ '">'+$entries.dataset.directionstext+'</a></p>'+
                                '</div>'+
                            '</div>';
    if (locationData.distance) {          
        if (locationData.distance == 1) {
            return entryHtml.innerHTML += "<p class='distance'>" + Math.round(locationData.distance) + " " + $entries.dataset.miletext + "</p>",
            entryHtml
        } else {
            return entryHtml.innerHTML += "<p class='distance'>" + Math.round(locationData.distance) + " " + $entries.dataset.milestext + "</p>",
            entryHtml
        }
    } 
    else {
        return entryHtml
    }
}

function formatPhone(e) {
    var n, t = ("" + e).replace(/\D/g, "").match(/^(1|)?(\d{3})(\d{3})(\d{4})$/), o;
    return t ? [t[1] ? "+1 " : "", "(", t[2], ") ", t[3], "-", t[4]].join("") : null
}

var initializeData = function () {
    $addressInput = document.getElementById("address");
    $entriesList = document.getElementById("entries-list");
    $entries = document.getElementById("entries");
    $locationResults = document.getElementById("location-results");
    $noEntries = document.getElementById("no-entries");
    $introText = document.getElementById("intro");
};

var initializeEvents = function () {
    $addressInput.addEventListener("keypress", function(event) { 
        13 === event.keyCode && manuallyRunAutocompleteSearch()
    });

    $entriesList.addEventListener("scroll", function() {
        var n = $entriesList.scrollHeight - $entriesList.offsetHeight;
        $entriesList.scrollTop + 1>= n && loadMoreEntryIndex();
    });
};

/**
    * Inits functionality in the module.
    */
var init = function () {
    initializeData();
    window.initMap = initMap;
    initializeEvents();
    
};

init();