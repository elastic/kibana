/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { Feature, Geometry, Position } from 'geojson';
import {
  RENDER_AS,
  GEOTILE_GRID_AGG_NAME,
  GEOCENTROID_AGG_NAME,
} from '../../../../common/constants';
import { getTileBoundingBox } from '../../util/geo_tile_utils';
import { clamp, extractPropertiesFromBucket } from '../../../../common/elasticsearch_util';

const GRID_BUCKET_KEYS_TO_IGNORE = ['key', GEOCENTROID_AGG_NAME];

export function convertCompositeRespToGeoJson(esResponse: any, renderAs: RENDER_AS): Feature[] {
  return convertToGeoJson(
    esResponse,
    renderAs,
    (esResponse: any) => {
      return _.get(esResponse, 'aggregations.compositeSplit.buckets', []);
    },
    (gridBucket: any) => {
      return gridBucket.key[GEOTILE_GRID_AGG_NAME];
    }
  );
}

export function convertRegularRespToGeoJson(esResponse: any, renderAs: RENDER_AS): Feature[] {
  return convertToGeoJson(
    esResponse,
    renderAs,
    (esResponse: any) => {
      return _.get(esResponse, `aggregations.${GEOTILE_GRID_AGG_NAME}.buckets`, []);
    },
    (gridBucket: any) => {
      return gridBucket.key;
    }
  );
}

function convertToGeoJson(
  esResponse: any,
  renderAs: RENDER_AS,
  pluckGridBuckets: (esResponse: any) => any[],
  pluckGridKey: (gridBucket: any) => string
): Feature[] {
  const features: Feature[] = [];

  const gridBuckets = pluckGridBuckets(esResponse);
  for (let i = 0; i < gridBuckets.length; i++) {
    const gridBucket = gridBuckets[i];
    const gridKey = pluckGridKey(gridBucket);
    features.push({
      type: 'Feature',
      geometry: rowToGeometry({
        gridKey,
        [GEOCENTROID_AGG_NAME]: gridBucket[GEOCENTROID_AGG_NAME],
        renderAs,
      }),
      id: gridKey,
      properties: extractPropertiesFromBucket(gridBucket, GRID_BUCKET_KEYS_TO_IGNORE),
    });
  }

  return features;
}

function rowToGeometry({
  gridKey,
  gridCentroid,
  renderAs,
}: {
  gridKey: string;
  gridCentroid: any;
  renderAs: RENDER_AS;
}): Geometry {
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
  const pointCoordinates: Position = [
    clamp(gridCentroid.location.lon, left, right),
    clamp(gridCentroid.location.lat, bottom, top),
  ];

  return {
    type: 'Point',
    coordinates: pointCoordinates,
  };
}
