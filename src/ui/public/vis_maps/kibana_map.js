import { EventEmitter } from 'events';
import L from 'leaflet';
import $ from 'jquery';
import _ from 'lodash';
import zoomToPrecision from 'ui/utils/zoom_to_precision';

const FitControl = L.Control.extend({
  options: {
    position: 'topleft'
  },
  initialize: function (fitContainer, kibanaMap) {
    this._fitContainer = fitContainer;
    this._kibanaMap = kibanaMap;
    this._leafletMap = null;
  },
  onAdd: function (leafletMap) {
    this._leafletMap = leafletMap;
    $(this._fitContainer).html('<a class="fa fa-crop" href="#" title="Fit Data Bounds"></a>')
      .on('click', e => {
        e.preventDefault();
        this._kibanaMap.fitToData();
      });

    return this._fitContainer;
  },
  onRemove: function () {
    $(this._fitContainer).off('click');
  }
});


const LegendControl = L.Control.extend({

  options: {
    position: 'topright'
  },

  updateContents() {
    this._legendContainer.empty();
    const $div = $('<div>').addClass('tilemap-legend');
    this._legendContainer.append($div);
    const layers = this._kibanaMap.getLayers();
    layers.forEach((layer) =>layer.appendLegendContents($div));
  },


  initialize: function (container, kibanaMap, position) {
    this._legendContainer = container;
    this._kibanaMap = kibanaMap;
    this.options.position = position;

  },
  onAdd: function () {
    this._layerUpdateHandle = () => this.updateContents();
    this._kibanaMap.on('layers:update', this._layerUpdateHandle);
    this.updateContents();
    return this._legendContainer.get(0);
  },
  onRemove: function () {
    this._kibanaMap.removeListener('layers:update', this._layerUpdateHandle);
  }

});

/**
 * Collects map functionality required for Kibana.
 * Serves as simple abstraction for leaflet as well.
 */
class KibanaMap extends EventEmitter {

  constructor(containerNode, options) {

    super();
    this._containerNode = containerNode;
    this._leafletBaseLayer = null;
    this._baseLayerSettings = null;
    this._baseLayerIsDesaturated = true;

    this._leafletDrawControl = null;
    this._leafletFitControl = null;
    this._leafletLegendControl = null;
    this._legendPosition = 'topright';

    this._layers = [];
    this._listeners = [];
    this._showTooltip = false;

    this._leafletMap = L.map(containerNode, {
      minZoom: options.minZoom,
      maxZoom: options.maxZoom
    });
    this._leafletMap.fitWorld();

    let previousZoom = this._leafletMap.getZoom();
    this._leafletMap.on('zoomend', () => {
      if (previousZoom !== this._leafletMap.getZoom()) {
        previousZoom = this._leafletMap.getZoom();
        this.emit('zoomchange');
      }
    });
    this._leafletMap.on('zoomend', e =>this.emit('zoomend'));
    this._leafletMap.on('moveend', e => this.emit('moveend'));
    this._leafletMap.on('mousemove', e => this._layers.forEach(layer => layer.movePointer('mousemove', e)));
    this._leafletMap.on('mouseout', e => this._layers.forEach(layer => layer.movePointer('mouseout', e)));
    this._leafletMap.on('mousedown', e => this._layers.forEach(layer => layer.movePointer('mousedown', e)));
    this._leafletMap.on('mouseup', e => this._layers.forEach(layer => layer.movePointer('mouseup', e)));
    this._leafletMap.on('draw:created', event => {
      const drawType = event.layerType;
      if (drawType === 'rectangle') {
        const bounds = event.layer.getBounds();

        const southEast = bounds.getSouthEast();
        const northWest = bounds.getNorthWest();
        let southEastLng = southEast.lng;
        if (southEastLng > 180) {
          southEastLng -= 360;
        }
        let northWestLng = northWest.lng;
        if (northWestLng < -180) {
          northWestLng += 360;
        }

        const southEastLat = southEast.lat;
        const northWestLat = northWest.lat;

        //Bounds cannot be created unless they form a box with larger than 0 dimensions
        //Invalid areas are rejected by ES.
        if (southEastLat === northWestLat || southEastLng === northWestLng) {
          return;
        }

        this.emit('drawCreated:rectangle', {
          bounds: {
            bottom_right: {
              lat: southEastLat,
              lon: southEastLng
            },
            top_left: {
              lat: northWestLat,
              lon: northWestLng
            }
          }
        });
      } else if (drawType === 'polygon') {
        const latLongs = event.layer.getLatLngs();
        this.emit('drawCreated:polygon', {
          points: latLongs.map(leafletLatLng => {
            return {
              lat: leafletLatLng.lat,
              lon: leafletLatLng.lng
            };
          })
        });
      }
    });

    this.resize();

  }

  setShowTooltip(showTooltip) {
    this._showTooltip = showTooltip;
  }

  getLayers() {
    return this._layers.slice();
  }

  addLayer(layer) {


    this.emit('layers:invalidate');

    const onshowTooltip = (event) => {

      if (!this._showTooltip) {
        return;
      }

      const popup = L.popup({ autoPan: false });
      popup.setLatLng(event.position);
      popup.setContent(event.content);
      popup.openOn(this._leafletMap);
    };

    layer.on('showTooltip', onshowTooltip);
    this._listeners.push({ name: 'showTooltip', handle: onshowTooltip, layer: layer });

    const onHideTooltip = () => this._leafletMap.closePopup();
    layer.on('hideTooltip', onHideTooltip);
    this._listeners.push({ name: 'hideTooltip', handle: onHideTooltip, layer: layer });


    const onStyleChanged = () => {
      if (this._leafletLegendControl) {
        this._leafletLegendControl.updateContents();
      }
    };
    layer.on('styleChanged', onStyleChanged);
    this._listeners.push({ name: 'styleChanged', handle: onStyleChanged, layer: layer });

    this._layers.push(layer);
    layer.addToLeafletMap(this._leafletMap);
    this.emit('layers:update');
  }


  isReady() {
    return this._layers.every(layer => layer.isReady());
  }

  removeLayer(layer) {
    const index = this._layers.indexOf(layer);
    if (index >= 0) {
      this._layers.splice(index, 1);
      layer.removeFromLeafletMap(this._leafletMap);
    }
  }

  destroy() {
    if (this._leafletFitControl) {
      this._leafletMap.removeControl(this._leafletFitControl);
    }
    if (this._leafletDrawControl) {
      this._leafletMap.removeControl(this._leafletDrawControl);
    }
    if (this._leafletLegendControl) {
      this._leafletMap.removeControl(this._leafletLegendControl);
    }
    this.setBaseLayer(null);
    for (const layer of this._layers) {
      layer.removeFromLeafletMap(this._leafletMap);
    }
    this._leafletMap.remove();
    this._containerNode.innerHTML = '';
    this._listeners.forEach(listener => listener.layer.removeListener(listener.name, listener.handle));
  }

  getCenter() {
    const center = this._leafletMap.getCenter();
    return { lon: center.lng, lat: center.lat };
  }

  setCenter(latitude, longitude) {
    const latLong = L.latLng(latitude, longitude);
    if (latLong.equals && !latLong.equals(this._leafletMap.getCenter())) {
      this._leafletMap.setView(latLong);
    }
  }

  setZoomLevel(zoomLevel) {
    if (this._leafletMap.getZoom() !== zoomLevel) {
      this._leafletMap.setZoom(zoomLevel);
    }
  }

  getZoomLevel() {
    return this._leafletMap.getZoom();
  }

  getAutoPrecision() {
    return zoomToPrecision(this._leafletMap.getZoom(), 12, this._leafletMap.getMaxZoom());
  }

  getBounds() {

    const bounds = this._leafletMap.getBounds();
    if (!bounds) {
      return null;
    }

    const southEast = bounds.getSouthEast();
    const northWest = bounds.getNorthWest();
    let southEastLng = southEast.lng;
    if (southEastLng > 180) {
      southEastLng -= 360;
    }
    let northWestLng = northWest.lng;
    if (northWestLng < -180) {
      northWestLng += 360;
    }

    const southEastLat = southEast.lat;
    const northWestLat = northWest.lat;

    //Bounds cannot be created unless they form a box with larger than 0 dimensions
    //Invalid areas are rejected by ES.
    if (southEastLat === northWestLat || southEastLng === northWestLng) {
      return;
    }

    return {
      bottom_right: {
        lat: southEastLat,
        lon: southEastLng
      },
      top_left: {
        lat: northWestLat,
        lon: northWestLng
      }
    };
  }


  setDesaturateBaseLayer(isDesaturated) {
    if (isDesaturated === this._baseLayerIsDesaturated) {
      return;
    }
    this._baseLayerIsDesaturated = isDesaturated;
    this._updateDesaturation();
    this._leafletBaseLayer.redraw();
  }

  addDrawControl() {
    const drawOptions = {
      draw: {
        polyline: false,
        marker: false,
        circle: false,
        polygon: false,
        rectangle: {
          shapeOptions: {
            stroke: false,
            color: '#000'
          }
        }
      }
    };
    this._leafletDrawControl = new L.Control.Draw(drawOptions);
    this._leafletMap.addControl(this._leafletDrawControl);
  }

  addFitControl() {

    if (this._leafletFitControl || !this._leafletMap) {
      return;
    }

    const fitContainer = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-control-fit');
    this._leafletFitControl = new FitControl(fitContainer, this);
    this._leafletMap.addControl(this._leafletFitControl);
  }

  addLegendControl() {
    if (this._leafletLegendControl || !this._leafletMap) {
      return;
    }
    this._updateLegend();
  }

  setLegendPosition(position) {
    this._legendPosition = position;
    if (this._leafletLegendControl) {
      this._leafletMap.removeControl(this._leafletLegendControl);
      this._updateLegend();
    }
  }

  _updateLegend() {
    const $wrapper = $('<div>').addClass('tilemap-legend-wrapper');
    this._leafletLegendControl = new LegendControl($wrapper, this, this._legendPosition);
    this._leafletMap.addControl(this._leafletLegendControl);
  }

  resize() {
    this._leafletMap.invalidateSize();
  }


  setBaseLayer(settings) {

    if (_.isEqual(settings, this._baseLayerSettings)) {
      return;
    }

    this._baseLayerSettings = settings;
    if (settings === null) {
      if (this._leafletBaseLayer && this._leafletMap) {
        this._leafletMap.removeLayer(this._leafletBaseLayer);
        this._leafletBaseLayer = null;
      }
      return;
    }

    if (this._leafletBaseLayer) {
      this._leafletMap.removeLayer(this._leafletBaseLayer);
      this._leafletBaseLayer = null;
    }

    let baseLayer;
    if (settings.baseLayerType === 'wms') {
      baseLayer = this._getWMSBaseLayer(settings.options);
    } else if (settings.baseLayerType === 'tms') {
      baseLayer = this._getTMSBaseLayer((settings.options));
    }

    baseLayer.on('tileload', () => this._updateDesaturation());
    baseLayer.on('load', () => { this.emit('baseLayer:loaded');});
    baseLayer.on('loading', () => {this.emit('baseLayer:loading');});

    this._leafletBaseLayer = baseLayer;
    this._leafletBaseLayer.addTo(this._leafletMap);
    this._leafletBaseLayer.bringToBack();
    this.resize();

  }

  fitToData() {

    if (!this._leafletMap) {
      return;
    }

    let bounds = null;
    this._layers.forEach(layer => {
      const leafletLayer = layer.getLeafletLayer();
      const b = leafletLayer.getBounds();
      if (bounds) {
        bounds.extend(b);
      } else {
        bounds = b;
      }
    });

    if (bounds) {
      this._leafletMap.fitBounds(bounds);
    }
  }

  _getTMSBaseLayer(options) {
    return L.tileLayer(options.url, {
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      subdomains: options.subdomains,
      attribution: options.attribution
    });
  }

  _getWMSBaseLayer(options) {
    return L.tileLayer.wms(options.url, {
      attribution: options.attribution,
      format: options.format,
      layers: options.layers,
      minZoom: options.minZoom,
      maxZoom: options.maxZoom,
      styles: options.styles,
      transparent: options.transparent,
      version: options.version
    });
  }

  _updateDesaturation() {
    const tiles = $('img.leaflet-tile-loaded');
    if (this._baseLayerIsDesaturated) {
      tiles.removeClass('filters-off');
    } else if (!this._baseLayerIsDesaturated) {
      tiles.addClass('filters-off');
    }
  }

  persistUiStateForVisualization(visualization) {
    this.on('moveend', () => {
      const uiState = visualization.getUiState();
      const centerFromUIState = uiState.get('mapCenter');
      const zoomFromUiState = parseInt(uiState.get('mapZoom'));
      if (isNaN(zoomFromUiState) || this.getZoomLevel() !== zoomFromUiState) {
        uiState.set('mapZoom', this.getZoomLevel());
      }
      const centerFromMap = this.getCenter();
      if (!centerFromUIState || centerFromMap.lon !== centerFromUIState[1] || centerFromMap.lat !== centerFromUIState[0]) {
        uiState.set('mapCenter', [centerFromMap.lat, centerFromMap.lon]);
      }
    });
  }

  useUiStateFromVisualization(visualization) {
    const uiState = visualization.getUiState();
    const zoomFromUiState = parseInt(uiState.get('mapZoom'));
    const centerFromUIState = uiState.get('mapCenter');
    if (!isNaN(zoomFromUiState)) {
      this.setZoomLevel(zoomFromUiState);
    }
    if (centerFromUIState) {
      this.setCenter(centerFromUIState[0], centerFromUIState[1]);
    }
  }


}




export default KibanaMap;

