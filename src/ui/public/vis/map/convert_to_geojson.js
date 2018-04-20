import { decodeGeoHash } from 'ui/utils/decode_geo_hash';
import { gridDimensions } from './grid_dimensions';


export function convertToGeoJson(tabifiedResponse) {

  let features;
  let min = Infinity;
  let max = -Infinity;
  let geoAgg;

  if (tabifiedResponse && tabifiedResponse.tables && tabifiedResponse.tables[0] && tabifiedResponse.tables[0].rows) {

    const table = tabifiedResponse.tables[0];
    const geohashIndex = table.columns.findIndex(column => column.aggConfig.type.dslName === 'geohash_grid');
    geoAgg = table.columns.find(column => column.aggConfig.type.dslName === 'geohash_grid');

    if (geohashIndex === -1) {
      features = [];
    } else {

      const metricIndex = table.columns.findIndex(column => column.aggConfig.type.type === 'metrics');
      const geocentroidIndex = table.columns.findIndex(column => column.aggConfig.type.dslName === 'geo_centroid');

      features = table.rows.map(row => {

        const geohash = row[geohashIndex];
        const geohashLocation = decodeGeoHash(geohash);

        let pointCoordinates;
        if (geocentroidIndex > -1) {
          const location = row[geocentroidIndex];
          pointCoordinates = [location.lon, location.lat];
        } else {
          pointCoordinates = [geohashLocation.longitude[2], geohashLocation.latitude[2]];
        }

        const rectangle = [
          [geohashLocation.latitude[0], geohashLocation.longitude[0]],
          [geohashLocation.latitude[0], geohashLocation.longitude[1]],
          [geohashLocation.latitude[1], geohashLocation.longitude[1]],
          [geohashLocation.latitude[1], geohashLocation.longitude[0]],
        ];

        const centerLatLng = [
          geohashLocation.latitude[2],
          geohashLocation.longitude[2]
        ];

        if (geoAgg.aggConfig.params.useGeocentroid) {
          // see https://github.com/elastic/elasticsearch/issues/24694 for why clampGrid is used
          pointCoordinates[0] = clampGrid(pointCoordinates[0], geohashLocation.longitude[0], geohashLocation.longitude[1]);
          pointCoordinates[1] = clampGrid(pointCoordinates[1], geohashLocation.latitude[0], geohashLocation.latitude[1]);
        }

        const value = row[metricIndex];
        min = Math.min(min, value);
        max = Math.max(max, value);

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: pointCoordinates
          },
          properties: {
            geohash: geohash,
            geohash_meta: {
              center: centerLatLng,
              rectangle: rectangle
            },
            value: value
          }
        };


      });

    }

  } else {
    features = [];
  }

  const featureCollection = {
    type: 'FeatureCollection',
    features: features
  };

  return {
    featureCollection: featureCollection,
    meta: {
      min: min,
      max: max,
      geohashPrecision: geoAgg && geoAgg.aggConfig.params.precision,
      geohashGridDimensionsAtEquator: geoAgg && gridDimensions(geoAgg.aggConfig.params.precision)
    }
  };
}

function clampGrid(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
