import { EventEmitter } from 'events';
import L from 'leaflet';
import zoomToPrecision from 'ui/utils/zoom_to_precision';
// import Notifier from 'ui/notify/notifier';



/**
 * Collects map functionality required for Kibana.
 * Serves as simple abstraction for leaflet as well.
 */
class KibanaMap extends EventEmitter {

  constructor(domNode) {

    super();


    this._leafletBaseLayer = null;
    this._leafletDrawControl = null;
    this._layers = [];
    this._leafletMap = L.map(domNode, {//todo: read this from meta
      minZoom: 0,
      maxZoom: 10
    });


    // this._leafletMap.setView([0, 0], 0);//todo: pass in from UI-state (if any)
    this._leafletMap.fitWorld();//todo: pass in from UI-state (if any)

    let previousZoom = this._leafletMap.getZoom();
    this._leafletMap.on('zoomend', e=> {
      if (previousZoom !== this._leafletMap.getZoom()) {
        previousZoom = this._leafletMap.getZoom();
        this.emit('zoomchange');
      }
    });

    this._leafletMap.on('zoomend', e => {
      this.emit('zoomend');
    });
    this._leafletMap.on('moveend', e => this.emit('moveend'));

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

  addLayer(layer) {
    this._layers.push(layer);
    layer.addToLeafletMap(this._leafletMap);
  }

  removeLayer(layer) {
    const index = this._layers.indexOf(layer);
    if (index >= 0) {
      this._layers.splice(index, 1);
      layer.removeFromLeafletMap(this._leafletMap);
    }
  }

  destroy() {
    this.setBaseLayer(null);
    for (const layer of this._layers) {
      layer.removeFromLeafletMap(this._leafletMap);
      layer.destroy();
    }
    this._leafletMap.remove();
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


  setBaseLayer(settings) {
    if (settings === null) {
      if (this._leafletBaseLayer && this._leafletMap) {
        this._leafletMap.removeLayer(this._leafletBaseLayer);
        this._leafletBaseLayer = null;
      }
      return;
    }

    if (this._leafletBaseLayer) {
      //todo: do this correctly, by checking if there is a difference.
      this._leafletMap.removeLayer(this._leafletBaseLayer);
      this._leafletBaseLayer = null;
    }

    let baseLayer;
    if (settings.baseLayerType === 'wms') {
      baseLayer = this._getWMSBaseLayer(settings.options);
    } else if (settings.baseLayerType === 'tms') {
      baseLayer = this._getTMSBaseLayer((settings.options));
    }

    this._leafletBaseLayer = baseLayer;
    this._leafletBaseLayer.addTo(this._leafletMap);
    this._leafletBaseLayer.bringToBack();
    this.resize();

  }

  _getTMSBaseLayer(options) {
    return L.tileLayer(options.url, {
      //todo
    });
  }

  _getWMSBaseLayer(options) {
    return L.tileLayer.wms(options.url, options);
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

  resize() {
    this._leafletMap.invalidateSize();
  }

}




export default KibanaMap;
