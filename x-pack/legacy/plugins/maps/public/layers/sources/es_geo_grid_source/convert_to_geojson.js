/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { RENDER_AS } from '../../../../common/constants';
import { getTileBoundingBox } from './geo_tile_utils';
import { extractPropertiesFromBucket } from '../../util/es_agg_utils';
import { clamp } from '../../../elasticsearch_geo_utils';

const GRID_BUCKET_KEYS_TO_IGNORE = ['key', 'gridCentroid'];

export function convertCompositeRespToGeoJson(esResponse, renderAs) {
  return convertToGeoJson(
    esResponse,
    renderAs,
    (esResponse) => {
      return _.get(esResponse, 'aggregations.compositeSplit.buckets', []);
    },
    (gridBucket) => {
      return gridBucket.key.gridSplit;
    }
  );
}

export function convertRegularRespToGeoJson(esResponse, renderAs) {
  return convertToGeoJson(
    esResponse,
    renderAs,
    (esResponse) => {
      return _.get(esResponse, 'aggregations.gridSplit.buckets', []);
    },
    (gridBucket) => {
      return gridBucket.key;
    }
  );
}

function convertToGeoJson(esResponse, renderAs, pluckGridBuckets, pluckGridKey) {
  const features = [];

  const gridBuckets = pluckGridBuckets(esResponse);
  for (let i = 0; i < gridBuckets.length; i++) {
    const gridBucket = gridBuckets[i];
    const gridKey = pluckGridKey(gridBucket);
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

  // see https://github.com/elastic/elasticsearch/issues/24694 for why clamp is used
  const pointCoordinates = [
    clamp(gridCentroid.location.lon, left, right),
    clamp(gridCentroid.location.lat, bottom, top),
  ];

  return {
    type: 'Point',
    coordinates: pointCoordinates,
  };
}
