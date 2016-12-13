import _ from 'lodash';
import L from 'leaflet';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from './base_marker';
export default function ShadedCircleMarkerFactory(Private) {

  const BaseMarker = Private(VislibVisualizationsMarkerTypesBaseMarkerProvider);

  /**
   * Map overlay: circle markers that are shaded to illustrate values
   *
   * @param map {Leaflet Object}
   * @param mapData {geoJson Object}
   * @return {Leaflet object} featureLayer
   */
  class ShadedCircleMarker extends BaseMarker {
    constructor(map, geoJson, params) {
      super(map, geoJson, params);

      // multiplier to reduce size of all circles
      const scaleFactor = 0.8;

      this._createMarkerGroup({
        pointToLayer: (feature, latlng) => {
          const radius = this._geohashMinDistance(feature) * scaleFactor;
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
    _geohashMinDistance(feature) {
      const centerPoint = _.get(feature, 'properties.center');
      const geohashRect = _.get(feature, 'properties.rectangle');

      // centerPoint is an array of [lat, lng]
      // geohashRect is the 4 corners of the geoHash rectangle
      //   an array that starts at the southwest corner and proceeds
      //   clockwise, each value being an array of [lat, lng]

      // center lat and southeast lng
      const east = L.latLng([centerPoint[0], geohashRect[2][1]]);
      // southwest lat and center lng
      const north = L.latLng([geohashRect[3][0], centerPoint[1]]);

      // get latLng of geohash center point
      const center = L.latLng([centerPoint[0], centerPoint[1]]);

      // get smallest radius at center of geohash grid rectangle
      const eastRadius = Math.floor(center.distanceTo(east));
      const northRadius = Math.floor(center.distanceTo(north));
      return _.min([eastRadius, northRadius]);
    };
  }


  return ShadedCircleMarker;
};
