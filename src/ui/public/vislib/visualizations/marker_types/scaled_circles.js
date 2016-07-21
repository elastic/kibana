define(function (require) {
  return function ScaledCircleMarkerFactory(Private) {
    var _ = require('lodash');
    var L = require('leaflet');

    var BaseMarker = Private(require('ui/vislib/visualizations/marker_types/base_marker'));

    /**
     * Map overlay: circle markers that are scaled to illustrate values
     *
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @param params {Object}
     */
    _.class(ScaledCircleMarker).inherits(BaseMarker);
    function ScaledCircleMarker(map, geoJson, params) {
      var self = this;
      ScaledCircleMarker.Super.apply(this, arguments);

      // multiplier to reduce size of all circles
      var scaleFactor = 0.6;

      this._createMarkerGroup({
        pointToLayer: function (feature, latlng) {
          var value = feature.properties.value;
          var scaledRadius = self._radiusScale(value) * scaleFactor;
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
    ScaledCircleMarker.prototype._radiusScale = function (value) {
      var precisionBiasBase = 5;
      var precisionBiasNumerator = 200;
      var zoom = this.map.getZoom();
      var maxValue = this.geoJson.properties.allmax;
      var precision = _.max(this.geoJson.features.map(function (feature) {
        return String(feature.properties.geohash).length;
      }));

      var pct = Math.abs(value) / Math.abs(maxValue);
      var zoomRadius = 0.5 * Math.pow(2, zoom);
      var precisionScale = precisionBiasNumerator / Math.pow(precisionBiasBase, precision);

      // square root value percentage
      return Math.pow(pct, 0.5) * zoomRadius * precisionScale;
    };


    return ScaledCircleMarker;
  };
});
