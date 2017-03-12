import _ from 'lodash';
import L from 'leaflet';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from './base_marker';
export default function ScaledCircleMarkerFactory(Private) {

  const BaseMarker = Private(VislibVisualizationsMarkerTypesBaseMarkerProvider);

  /**
   * Map overlay: circle markers that are scaled to illustrate values
   *
   * @param map {Leaflet Object}
   * @param mapData {geoJson Object}
   * @param params {Object}
   */
  class ScaledCircleMarker extends BaseMarker {
    constructor(map, geoJson, params) {
      super(map, geoJson, params);

      // multiplier to reduce size of all circles
      const scaleFactor = 0.6;

      this._createMarkerGroup({
        pointToLayer: (feature, latlng) => {
          const value = feature.properties.value;
          const scaledRadius = this._radiusScale(value) * scaleFactor;
          return L.circleMarker(latlng).setRadius(scaledRadius);
        }
      });
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
      const zoom = this.map.getZoom();
      const maxValue = this.geoJson.properties.allmax;
      const precision = _.max(this.geoJson.features.map(function (feature) {
        return String(feature.properties.geohash).length;
      }));

      const pct = Math.abs(value) / Math.abs(maxValue);
      const zoomRadius = 0.5 * Math.pow(2, zoom);
      const precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

      // square root value percentage
      return Math.pow(pct, 0.5) * zoomRadius * precisionScale;
    }
  }


  return ScaledCircleMarker;
}
