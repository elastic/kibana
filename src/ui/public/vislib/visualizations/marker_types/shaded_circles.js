define(function (require) {
  return function ShadedCircleMarkerFactory(Private) {
    let _ = require('lodash');
    let L = require('leaflet');

    let BaseMarker = Private(require('ui/vislib/visualizations/marker_types/base_marker'));

    /**
     * Map overlay: circle markers that are shaded to illustrate values
     *
     * @param map {Leaflet Object}
     * @param mapData {geoJson Object}
     * @return {Leaflet object} featureLayer
     */
    _.class(ShadedCircleMarker).inherits(BaseMarker);
    function ShadedCircleMarker(map, geoJson, params) {
      let self = this;
      ShadedCircleMarker.Super.apply(this, arguments);

      // super min and max from all chart data
      let min = this.geoJson.properties.allmin;
      let max = this.geoJson.properties.allmax;

      // multiplier to reduce size of all circles
      let scaleFactor = 0.8;

      this._createMarkerGroup({
        pointToLayer: function (feature, latlng) {
          let radius = self._geohashMinDistance(feature) * scaleFactor;
          return L.circle(latlng, radius);
        }
      });
    }

    /**
     * _geohashMinDistance returns a min distance in meters for sizing
     * circle markers to fit within geohash grid rectangle
     *
     * @method _geohashMinDistance
     * @param feature {Object}
     * @return {Number}
     */
    ShadedCircleMarker.prototype._geohashMinDistance = function (feature) {
      let centerPoint = _.get(feature, 'properties.center');
      let geohashRect = _.get(feature, 'properties.rectangle');

      // centerPoint is an array of [lat, lng]
      // geohashRect is the 4 corners of the geoHash rectangle
      //   an array that starts at the southwest corner and proceeds
      //   clockwise, each value being an array of [lat, lng]

      // center lat and southeast lng
      let east   = L.latLng([centerPoint[0], geohashRect[2][1]]);
      // southwest lat and center lng
      let north  = L.latLng([geohashRect[3][0], centerPoint[1]]);

      // get latLng of geohash center point
      let center = L.latLng([centerPoint[0], centerPoint[1]]);

      // get smallest radius at center of geohash grid rectangle
      let eastRadius  = Math.floor(center.distanceTo(east));
      let northRadius = Math.floor(center.distanceTo(north));
      return _.min([eastRadius, northRadius]);
    };

    return ShadedCircleMarker;
  };
});
