import { EventEmitter } from 'events';


export default class KibanaMapLayer extends EventEmitter {
  constructor() {
    super();
    this._leafletLayer = null;
  }
  getLeafletLayer() {
    return this._leafletLayer;
  }

  addToLeafletMap(leafletMap) {
    this._leafletLayer.addTo(leafletMap);
  }

  removeFromLeafletMap(leafletMap) {
    leafletMap.removeLayer(this._leafletLayer);
  }

  appendLegendContents() {
  }

  updateExtent() {
  }

  movePointer() {
  }

  getBounds() {
  }
}








