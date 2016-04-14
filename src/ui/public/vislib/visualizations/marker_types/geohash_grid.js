define(function (require) {
  return function GeohashGridMarkerFactory(Private) {
    let _ = require('lodash');
    let L = require('leaflet');

    let BaseMarker = Private(require('ui/vislib/visualizations/marker_types/base_marker'));

    /**
     * Map overlay: rectangles that show the geohash grid bounds
     *
     * @param map {Leaflet Object}
     * @param geoJson {geoJson Object}
     * @param params {Object}
     */
    _.class(GeohashGridMarker).inherits(BaseMarker);
    function GeohashGridMarker(map, geoJson, params) {
      let self = this;
      GeohashGridMarker.Super.apply(this, arguments);

      // super min and max from all chart data
      let min = this.geoJson.properties.allmin;
      let max = this.geoJson.properties.allmax;

      this._createMarkerGroup({
        pointToLayer: function (feature, latlng) {
          let geohashRect = feature.properties.rectangle;
          // get bounds from northEast[3] and southWest[1]
          // corners in geohash rectangle
          let corners = [
            [geohashRect[3][0], geohashRect[3][1]],
            [geohashRect[1][0], geohashRect[1][1]]
          ];
          return L.rectangle(corners);
        }
      });
    }

    return GeohashGridMarker;
  };
});
