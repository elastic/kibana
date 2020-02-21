/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { RENDER_AS } from './render_as';
import { getTileBoundingBox } from './geo_tile_utils';
import { extractPropertiesFromBucket } from '../../util/es_agg_utils';

const GRID_BUCKET_KEYS_TO_IGNORE = ['key', 'gridCentroid'];

export function convertToGeoJson(esResponse, renderAs) {
  const features = [];

  const gridBuckets = _.get(esResponse, 'aggregations.compositeSplit.buckets', []);
  for (let i = 0; i < gridBuckets.length; i++) {
    const gridBucket = gridBuckets[i];
    const gridKey = gridBucket.key.gridSplit;
    features.push({
      type: 'Feature',
      geometry: rowToGeometry({
        gridKey,
        gridCentroid: gridBucket.gridCentroid,
        renderAs,
      }),
      id: gridKey,
      properties: extractPropertiesFromBucket(gridBucket, GRID_BUCKET_KEYS_TO_IGNORE),
    });
  }

  return features;
}

function rowToGeometry({ gridKey, gridCentroid, renderAs }) {
  const { top, bottom, right, left } = getTileBoundingBox(gridKey);

  if (renderAs === RENDER_AS.GRID) {
    return {
      type: 'Polygon',
      coordinates: [
        [
          [right, top],
          [left, top],
          [left, bottom],
          [right, bottom],
          [right, top],
        ],
      ],
    };
  }

  // see https://github.com/elastic/elasticsearch/issues/24694 for why clampGrid is used
  const pointCoordinates = [
    clampGrid(gridCentroid.location.lon, left, right),
    clampGrid(gridCentroid.location.lat, bottom, top),
  ];

  return {
    type: 'Point',
    coordinates: pointCoordinates,
  };
}

function clampGrid(val, min, max) {
  if (val > max) val = max;
  else if (val < min) val = min;
  return val;
}
