import _ from 'lodash';
import L from 'leaflet';
import VislibVisualizationsMarkerTypesBaseMarkerProvider from 'ui/vislib/visualizations/marker_types/base_marker';
import {geohashColumns, geohashRows} from 'ui/utils/decode_geo_hash';


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

    let maxGeohashPrecision = 1;
    for (let i = 0; i < geoJson.features.length; i += 1) {
      maxGeohashPrecision = Math.max(geoJson.features[i].properties.geohash.length, maxGeohashPrecision);
    }
    const worldInPixels = 256 * Math.pow(2, this.map.getZoom());//map is 256 pixels wide at zoom level 0
    const geohashColCount = geohashColumns(maxGeohashPrecision);
    const geohashRowCount = geohashRows(maxGeohashPrecision);
    const geoHashWidthInPixels = worldInPixels / geohashColCount;
    const geoHashHeightInPixels = worldInPixels / geohashRowCount;
    const maxRadius = Math.min(geoHashWidthInPixels, geoHashHeightInPixels) / 2;
    const biasTerm = 1 / 3;//ensure smallest circle is never smaller than this
    const minRadius = maxRadius * biasTerm;

    this._valueRange = this.geoJson.properties.allmax - this.geoJson.properties.allmin;
    this._maxCircleArea = Math.PI * Math.pow(maxRadius, 2);
    this._minCircleArea = Math.PI * Math.pow(minRadius, 2);

    this._createMarkerGroup({
      pointToLayer: (feature, latlng) => L.circleMarker(latlng).setRadius(this._radiusScale(feature.properties.value))
    });

  }

  ScaledCircleMarker.prototype._radiusScale = function (value) {
    const ratioFeatureToDataset = this._valueRange ? (value - this.geoJson.properties.allmin) / this._valueRange : 1;
    const circleArea = this._minCircleArea + ratioFeatureToDataset * (this._maxCircleArea - this._minCircleArea);
    return Math.round(Math.sqrt(circleArea / Math.PI));
  };


  return ScaledCircleMarker;
};
