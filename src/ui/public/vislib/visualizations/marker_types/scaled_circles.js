import _ from 'lodash';
import L from 'leaflet';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from 'ui/vislib/visualizations/marker_types/base_marker';
export default function ScaledCircleMarkerFactory(Private) {

  let BaseMarker = Private(VislibVisualizationsMarkerTypesBaseMarkerProvider);

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
      let scaleFactor = 0.6;

      this._createMarkerGroup({
        pointToLayer: (feature, latlng) => {
          let value = feature.properties.value;
          let scaledRadius = this._radiusScale(value) * scaleFactor;
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
      let precisionBiasBase = 5;
      let precisionBiasNumerator = 200;
      let zoom = this.map.getZoom();
      let maxValue = this.geoJson.properties.allmax;
      let precision = _.max(this.geoJson.features.map(function (feature) {
        return String(feature.properties.geohash).length;
      }));

      let pct = Math.abs(value) / Math.abs(maxValue);
      let zoomRadius = 0.5 * Math.pow(2, zoom);
      let precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

      // square root value percentage
      return Math.pow(pct, 0.5) * zoomRadius * precisionScale;
    };
  }


  return ScaledCircleMarker;
};
