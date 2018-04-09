import { decodeGeoHash } from 'ui/utils/decode_geo_hash';
import { gridDimensions } from 'ui/agg_response/geo_json/grid_dimensions';


/**
 the shape of the ES-response is well-defined and fixed for coordinate maps.
 1st agg = metric
 2nd agg = bucket of geohash (only ever one)
 3rd agg = geocentroid (optional)

 We can decode this as-is without having to rely on any dynamic decoding (such as tabify).

 The main advantage is that we can ignore all irrelevant functionality.

 * @param rawEsResponse raw ES-response of query
 * @return {Object} an object with the geojson Featurecollection and additional metadata.
 */
export function convertToGeoJson(rawEsResponse, geoAgg) {


  let features;
  let min = Infinity;
  let max = -Infinity;

  if (rawEsResponse.aggregations) {

    const buckets = findProperty(rawEsResponse.aggregations, 'buckets');
    if (!buckets) {//only happens when this function is misused.
      throw new Error('ES Response should at least contain single bucket aggregation.');
    }

    features = buckets.map((bucket) => {

      const geohash = bucket.key;
      const location = findProperty(bucket, 'location');

      let pointCoordinates;
      const geohashLocation = decodeGeoHash(geohash);
      if (location) {
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

      if (geoAgg.params.useGeocentroid) {
        // see https://github.com/elastic/elasticsearch/issues/24694 for why clampGrid is used
        pointCoordinates[0] = clampGrid(pointCoordinates[0], geohashLocation.longitude[0], geohashLocation.longitude[1]);
        pointCoordinates[1] = clampGrid(pointCoordinates[1], geohashLocation.latitude[0], geohashLocation.latitude[1]);
      }


      let value;
      value = findProperty(bucket, 'value');
      if (typeof value === 'undefined') {
        value = bucket.doc_count;
      }

      min = Math.min(min, value);
      max = Math.max(max, value);

      const feature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: pointCoordinates
        },
        properties: {
          geohash: geohash,
          doc_count: bucket.doc_count,
          geohash_meta: {
            center: centerLatLng,
            rectangle: rectangle
          },
          value: value
        }
      };
      return feature;
    });
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
      geohashPrecision: geoAgg && geoAgg.params.precision,
      geohashGridDimensionsAtEquator: geoAgg && gridDimensions(geoAgg.params.precision)
    }
  };
}

function clampGrid(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}

function findProperty(esReponse, aggName) {
  const stack = [esReponse];
  do {
    const node = stack.pop();
    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        if (key === aggName) {
          return node[key];
        } else {
          if (typeof node[key] === 'object') {
            stack.push(node[key]);
          }
        }
      }
    }
  } while (stack.length);
}
