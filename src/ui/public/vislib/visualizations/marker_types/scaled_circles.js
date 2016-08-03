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
  _.class(ScaledCircleMarker).inherits(BaseMarker);

  function ScaledCircleMarker(map, geoJson, params) {

    ScaledCircleMarker.Super.apply(this, arguments);

    let maxGeohashPrecision = -Infinity;
    for (let i = 0; i < geoJson.features.length; i += 1) {
      maxGeohashPrecision = geoJson.features[i].properties.geohash.length;
    }

    const worldInPixels = 256 * Math.pow(2, this.map.getZoom());//map is 256 pixels wide at zoom level 0
    const geoHashWidthInPixels = worldInPixels / Math.pow(8, maxGeohashPrecision);//Eight geohash cells per precision

    const maxRadius = geoHashWidthInPixels / 2;
    const minRadius = maxRadius / 3;//magic number. make sure smallest circle is not too small
    const maxCircleArea = Math.PI * Math.pow(maxRadius, 2);
    const minCircleArea = Math.PI * Math.pow(minRadius, 2);
    const valueRange = (this.geoJson.properties.allmax - this.geoJson.properties.allmin);

    this._createMarkerGroup({
      pointToLayer: (feature, latlng) => {
        const ratioFeatureToDataset = valueRange ? (feature.properties.value - this.geoJson.properties.allmin) / valueRange : 1;
        const circleArea = minCircleArea + ratioFeatureToDataset * (maxCircleArea - minCircleArea);
        return L.circleMarker(latlng).setRadius(Math.sqrt(circleArea / Math.PI));
      }
    });

  }

  return ScaledCircleMarker;
};
