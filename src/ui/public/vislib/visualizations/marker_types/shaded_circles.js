import _ from 'lodash';
import L from 'leaflet';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from 'ui/vislib/visualizations/marker_types/base_marker';
export default function ShadedCircleMarkerFactory(Private) {

  var BaseMarker = Private(VislibVisualizationsMarkerTypesBaseMarkerProvider);

  /**
   * Map overlay: circle markers that are shaded to illustrate values
   *
   * @param map {Leaflet Object}
   * @param mapData {geoJson Object}
   * @return {Leaflet object} featureLayer
   */
  _.class(ShadedCircleMarker).inherits(BaseMarker);
  function ShadedCircleMarker(map, geoJson, params) {
    var self = this;
    ShadedCircleMarker.Super.apply(this, arguments);

    // super min and max from all chart data
    var min = this.geoJson.properties.allmin;
    var max = this.geoJson.properties.allmax;

    // multiplier to reduce size of all circles
    var scaleFactor = 0.8;

    this._createMarkerGroup({
      pointToLayer: function (feature, latlng) {
        var radius = self._geohashMinDistance(feature) * scaleFactor;
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
    var centerPoint = _.get(feature, 'properties.center');
    var geohashRect = _.get(feature, 'properties.rectangle');

    // centerPoint is an array of [lat, lng]
    // geohashRect is the 4 corners of the geoHash rectangle
    //   an array that starts at the southwest corner and proceeds
    //   clockwise, each value being an array of [lat, lng]

    // center lat and southeast lng
    var east   = L.latLng([centerPoint[0], geohashRect[2][1]]);
    // southwest lat and center lng
    var north  = L.latLng([geohashRect[3][0], centerPoint[1]]);

    // get latLng of geohash center point
    var center = L.latLng([centerPoint[0], centerPoint[1]]);

    // get smallest radius at center of geohash grid rectangle
    var eastRadius  = Math.floor(center.distanceTo(east));
    var northRadius = Math.floor(center.distanceTo(north));
    return _.min([eastRadius, northRadius]);
  };

  return ShadedCircleMarker;
};
