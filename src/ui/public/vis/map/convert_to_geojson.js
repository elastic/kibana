import { decodeGeoHash } from 'ui/utils/decode_geo_hash';


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
export function convertToGeoJson(rawEsResponse, vis) {


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
      if (location) {
        pointCoordinates = [location.lon, location.lat];
      } else {
        const geohashLocation = decodeGeoHash(geohash);
        pointCoordinates = [geohashLocation.longitude[2], geohashLocation.latitude[2]];
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
      max: max
    }
  };
}


function findProperty(esReponse, aggName) {
  const stack = [esReponse];
  let node = esReponse;
  let property;
  do {
    node = stack.pop();
    for (const key in node) {
      if (node.hasOwnProperty(key)) {
        if (key === aggName) {
          property = node[key];
          break;
        } else {
          if (typeof node[key] === 'object') {
            stack.push(node[key]);
          }
        }
      }
    }
  } while (stack.length);
  return property;
}
