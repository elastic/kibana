/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

const LAT_INDEX = 0;
const LON_INDEX = 1;

function parsePointFromKey(key) {
  const split = key.split(',');
  const lat = parseFloat(split[LAT_INDEX]);
  const lon = parseFloat(split[LON_INDEX]);
  return [lon, lat];
}

export function convertToLines(esResponse) {
  const lineFeatures = [];

  const destBuckets = _.get(esResponse, 'aggregations.destSplit.buckets', []);
  for (let i = 0; i < destBuckets.length; i++) {
    const destBucket = destBuckets[i];
    const dest = parsePointFromKey(destBucket.key);
    const sourceBuckets = _.get(destBucket, 'sourceGrid.buckets', []);
    for (let j = 0; j < sourceBuckets.length; j++) {
      const { key, sourceCentroid, ...rest } = sourceBuckets[j];

      // flatten metrics
      Object.keys(rest).forEach(key => {
        if (_.has(rest[key], 'value')) {
          rest[key] = rest[key].value;
        }
      });

      lineFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[sourceCentroid.location.lon, sourceCentroid.location.lat], dest],
        },
        id: `${dest.join()},${key}`,
        properties: {
          ...rest,
        },
      });
    }
  }

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features: lineFeatures,
    },
  };
}
