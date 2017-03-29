import L from 'leaflet';
import ScaledCircles from './scaled_circles';

export default class GeohashGrid extends ScaledCircles {
  getMarkerFunction() {
    return function (feature) {
      const geohashRect = feature.properties.rectangle;
      // get bounds from northEast[3] and southWest[1]
      // corners in geohash rectangle
      const corners = [
        [geohashRect[3][0], geohashRect[3][1]],
        [geohashRect[1][0], geohashRect[1][1]]
      ];
      return L.rectangle(corners);
    };
  }
}
