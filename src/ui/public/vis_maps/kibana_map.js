import { EventEmitter } from 'events';
import L from 'leaflet';
import $ from 'jquery';
import _ from 'lodash';
import zoomToPrecision from 'ui/utils/zoom_to_precision';
// import Notifier from 'ui/notify/notifier';


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

  options: {},

  _updateContents() {
    this._legendContainer.empty();
    const $div = $('<div>').addClass('tilemap-legend');
    this._legendContainer.append($div);
    const layers = this._kibanaMap.getLayers();
    layers.forEach((layer) =>layer.appendLegendContents($div));
  },

  initialize: function (container, kibanaMap) {
    this._legendContainer = container;
    this._kibanaMap = kibanaMap;

  },
  onAdd: function () {
    this._layerUpdateHandle = this._kibanaMap.on('layers:update', () => this._updateContents());
    this._updateContents();
    return this._legendContainer.get(0);
  },
  onRemove: function () {
    this._layerUpdateHandle.remove();
  }

});

/**
 * Collects map functionality required for Kibana.
 * Serves as simple abstraction for leaflet as well.
 */
class KibanaMap extends EventEmitter {

  constructor(containerNode) {

    super();


    this._containerNode = containerNode;
    this._leafletBaseLayer = null;
    this._baseLayerSettings = null;
    this._baseLayerIsDesaturated = true;

    this._leafletDrawControl = null;
    this._leafletFitControl = null;
    this._leafletLegendControl = null;

    this._layers = [];
    this._listeners = [];
    this._leafletMap = L.map(containerNode, {//todo: read this from meta
      minZoom: 0,
      maxZoom: 10
    });


    // this._leafletMap.setView([0, 0], 0);//todo: pass in from UI-state (if any)
    this._leafletMap.fitWorld();//todo: pass in from UI-state (if any)

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

  getLayers() {
    return this._layers.slice();
  }

  addLayer(layer) {

    const onTooltip = layer.on('showTooltip', (event) => {
      const popup = L.popup({ autoPan: false });
      popup.setLatLng(event.position);
      popup.setContent(event.content);
      popup.openOn(this._leafletMap);
    });
    const hideTooltip = layer.on('hideTooltip', () => this._leafletMap.closePopup());
    this._listeners.push(onTooltip);
    this._listeners.push(hideTooltip);

    this._layers.push(layer);
    layer.addToLeafletMap(this._leafletMap);
    this.emit('layers:update');
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
    this._listeners.forEach(listener => listener.remove());
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
    //todo: not correct, should take into account settigns...
    return zoomToPrecision(this._leafletMap.getZoom(), 12);
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
    this._baseLayerIsDesaturated = isDesaturated;

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

    const $wrapper = $('<div>').addClass('tilemap-legend-wrapper');
    this._leafletLegendControl = new LegendControl($wrapper, this);
    this._leafletMap.addControl(this._leafletLegendControl);
  }

  resize() {
    this._leafletMap.invalidateSize();
  }


  setBaseLayer(settings) {

    if (_.isEqual(settings, this._baseLayerSettings)) {
      this._updateDesaturation();
      this._leafletBaseLayer.redraw();
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
      const l = layer.getLeafletLayer();
      const b = l.getBounds();
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
      //todo
    });
  }

  _getWMSBaseLayer(options) {
    return L.tileLayer.wms(options.url, options);
  }

  _updateDesaturation() {
    const tiles = $('img.leaflet-tile-loaded');
    if (this._baseLayerIsDesaturated) {
      tiles.removeClass('filters-off');
    } else if (!this._baseLayerIsDesaturated) {
      tiles.addClass('filters-off');
    }
  }


}




export default KibanaMap;

