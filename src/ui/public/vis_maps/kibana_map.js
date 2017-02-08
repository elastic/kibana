import { EventEmitter } from 'events';
import L from 'leaflet';
import _ from 'lodash';

import Notifier from 'ui/notify/notifier';


class GeohashGridOverlay {
  constructor(featureCollection, targetMapZoom) {

    this._featureCollection = featureCollection;
    this._targetMapZoom = targetMapZoom;


    const styleFunction = this.getStyleFunction();
    this._leafletGeoJsonLayer = new L.geoJson(null, {
      pointToLayer: styleFunction
    });
    this._leafletGeoJsonLayer.addData(featureCollection);
    this._leafletGeoJsonLayer.setStyle(dummyStyle);

  }

  isGeoJsonEqual(featureCollection) {
    return _.isEqual(this._featureCollection, featureCollection);
  }

  addToLeafletMap(leafletMap) {
    console.log('add leaflet to map');
    this._leafletGeoJsonLayer.addTo(leafletMap);
  }

  removeFromMap(leafletMap) {
    leafletMap.removeLayer(this._leafletGeoJsonLayer);
  }


  getStyleFunction(zoom) {
    return (feature, latlng) => {
      return L.circleMarker(latlng).setRadius(10);
    };
  }

}


class ScaledCircleOverlay extends GeohashGridOverlay {
  constructor() {
    super(...arguments);
  }

  getStyleFunction() {
    const scaleFactor = 0.6;
    return (feature, latlng) => {
      const value = feature.properties.value;
      const scaledRadius = this._radiusScale(value) * scaleFactor;
      return L.circleMarker(latlng).setRadius(scaledRadius);
    }
  }

  /**
   * radiusScale returns a number for scaled circle markers
   * for relative sizing of markers
   *
   * @method _radiusScale
   * @param value {Number}
   * @return {Number}
   */
  _radiusScale(value) {
    const precisionBiasBase = 5;
    const precisionBiasNumerator = 200;
    const zoom = this._featureCollection.properties.zoom;
    const maxValue = this._featureCollection.properties.max;
    const precision = _.max(this._featureCollection.features.map((feature) => {
      return String(feature.properties.geohash).length;
    }));

    const pct = Math.abs(value) / Math.abs(maxValue);
    const zoomRadius = 0.5 * Math.pow(2, zoom);
    const precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

    // square root value percentage
    return Math.pow(pct, 0.5) * zoomRadius * precisionScale;
  }


}

function dummyStyle(feature) {
  return {};
}












class KibanaMap extends EventEmitter {

  constructor(domNode, options) {

    super();

    this._leafletMap = L.map(domNode, {});
    this._leafletMap.setView([0, 0], 0);
    this._leafletMap.on('zoomend', e => this.emit('zoomend'));
    this._leafletMap.on('moveend', e => this.emit('moveend'));
    this.resize();

    this._leafletBaseLayer = null;
    this._geohashGridOverlay = null;
    this._leafletDrawControl = null;

    this._addDrawControl();

  }


  getCenter() {
    const center = this._leafletMap.getCenter();
    return {lon: center.lng, lat: center.lat};
  }

  setCenter(latitude, longitude) {
    const latLong = new L.latLng(latitude, longitude);
    if (latLong.equals && !latLong.equals(this._leafletMap.getCenter())) {
      this._leafletMap.setView(latLong);
    }
  }


  setZoomLevel(zoomLevel) {
    if (this._leafletMap.getZoom() !== zoomLevel) {
      this._leafletMap.setZoom(zoomLevel);
    }
  }

  getZoomLevel(){
    return this._leafletMap.getZoom();
  }


  setTMSBaseLayer(options) {
    if (!this._leafletBaseLayer) {
      this._leafletBaseLayer = new L.tileLayer(options.url, {});
      this._leafletBaseLayer.addTo(this._leafletMap);
      this._leafletBaseLayer.bringToBack();
      this.resize();
      return;
    }

    //todo: make changes if settings change
    console.log('make changes if settings change');
  }

  setWMSBaseLayer(options){
    console.log('setWMSBaseLayer', arguments);

  }

  _addDrawControl() {


    const drawOptions = {
      draw: {
        polyline: false,
        marker: false,
        polygon: {
          shapeOptions: {
            stroke: false,
            color: '#000'
          }
        },
        circle: {
          shapeOptions: {
            stroke: false,
            color: '#000'
          }
        },
        rectangle: {
          shapeOptions: {
            stroke: false,
            color: '#000'
          }
        }
      }
    };


    this._leafletDrawControl = new L.Control.Draw(drawOptions);
    this._leafletMap.addControl(this._leafletDrawControl)
  };

  setGeohashFeatureCollection(featureCollection) {

    if (this._geohashGridOverlay && this._geohashGridOverlay.isGeoJsonEqual(featureCollection)) {
      return;
    }

    if (this._geohashGridOverlay) {
      this._geohashGridOverlay.removeFromMap(this._leafletMap);
    }


    console.log('set fc', this._geohashOptions);

    const targetZoom = this._leafletMap.getZoom();
    switch (this._geohashOptions.mapType) {
      case 'Scaled Circle Markers':
        this._geohashGridOverlay = new ScaledCircleOverlay(featureCollection, targetZoom);
        break;
      default:
        throw new Error('map type not recognized')

    }

    this._geohashGridOverlay.addToLeafletMap(this._leafletMap);
  }

  setGeohashLayerOptions(options) {

    if (_.isEqual(this._geohashOptions, options)) {
      return;
    }

    this._geohashOptions = options;

  }

  resize() {
    this._leafletMap.invalidateSize();
  }

}


export default KibanaMap;
