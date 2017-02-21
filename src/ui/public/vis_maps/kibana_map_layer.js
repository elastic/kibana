import { EventEmitter } from 'events';
// import L from 'leaflet';
// import $ from 'jquery';


export default class KibanaMapLayer extends EventEmitter {
  constructor() {
    super();
    this._leafletLayer = null;
  }

  destroy() {

  }

  addToLeafletMap(leafletMap) {
    this._leafletLayer.addTo(leafletMap);
  }

  removeFromLeafletMap(leafletMap) {
    leafletMap.removeLayer(this._leafletLayer);
  }
}








