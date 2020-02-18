/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { RENDER_AS } from './render_as';
import { getTileBoundingBox } from './geo_tile_utils';

export function convertToGeoJson(esResponse, renderAs) {
  const features = [];

  const gridBuckets = _.get(esResponse, 'aggregations.gridSplit.buckets', []);
  for (let i = 0; i < gridBuckets.length; i++) {
    const gridBucket = gridBuckets[i];
    const { key, gridCentroid, doc_count, ...rest } = gridBucket; // eslint-disable-line camelcase
    const properties = { doc_count }; // eslint-disable-line camelcase
    Object.keys(rest).forEach(key => {
      if (_.has(rest[key], 'value')) {
        properties[key] = rest[key].value;
      } else if (_.has(rest[key], 'buckets')) {
        properties[key] = _.get(rest[key], 'buckets[0].key');
      }
    });

    features.push({
      type: 'Feature',
      geometry: rowToGeometry({
        gridKey: key,
        gridCentroid,
        renderAs,
      }),
      id: key,
      properties,
    });
  }

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features: features,
    },
  };
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
