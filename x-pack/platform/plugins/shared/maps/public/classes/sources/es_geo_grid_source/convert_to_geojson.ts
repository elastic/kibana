/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Feature, Geometry, Position } from 'geojson';
import type {
  AggregationsCompositeAggregate,
  AggregationsCompositeBucket,
  AggregationsGeoCentroidAggregate,
  AggregationsGeoTileGridAggregate,
  AggregationsGeoTileGridBucket,
  LatLonGeoLocation,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
import {
  RENDER_AS,
  GEOTILE_GRID_AGG_NAME,
  GEOCENTROID_AGG_NAME,
} from '../../../../common/constants';
import { getTileBoundingBox } from '../../util/geo_tile_utils';
import { clamp, extractPropertiesFromBucket } from '../../../../common/elasticsearch_util';

const GRID_BUCKET_KEYS_TO_IGNORE = ['key', GEOCENTROID_AGG_NAME];

type EsResponse = Pick<SearchResponse<unknown>, 'aggregations'>;

export function convertCompositeRespToGeoJson(
  esResponse: EsResponse,
  renderAs: RENDER_AS
): Feature[] {
  return convertToGeoJson<AggregationsCompositeBucket>(
    esResponse,
    renderAs,
    (response) => {
      const compositeSplit = response.aggregations?.compositeSplit as
        | AggregationsCompositeAggregate
        | undefined;
      return (compositeSplit?.buckets as AggregationsCompositeBucket[] | undefined) ?? [];
    },
    (gridBucket) => {
      return gridBucket.key[GEOTILE_GRID_AGG_NAME] as string;
    }
  );
}

export function convertRegularRespToGeoJson(
  esResponse: EsResponse,
  renderAs: RENDER_AS
): Feature[] {
  return convertToGeoJson<AggregationsGeoTileGridBucket>(
    esResponse,
    renderAs,
    (response) => {
      const geotileGrid = response.aggregations?.[GEOTILE_GRID_AGG_NAME] as
        | AggregationsGeoTileGridAggregate
        | undefined;
      return (geotileGrid?.buckets as AggregationsGeoTileGridBucket[] | undefined) ?? [];
    },
    (gridBucket) => {
      return gridBucket.key;
    }
  );
}

function convertToGeoJson<
  TBucket extends AggregationsCompositeBucket | AggregationsGeoTileGridBucket
>(
  esResponse: EsResponse,
  renderAs: RENDER_AS,
  pluckGridBuckets: (esResponse: EsResponse) => TBucket[],
  pluckGridKey: (gridBucket: TBucket) => string
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
        gridCentroid: gridBucket[GEOCENTROID_AGG_NAME] as AggregationsGeoCentroidAggregate,
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
  gridCentroid: AggregationsGeoCentroidAggregate;
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
    clamp((gridCentroid.location as LatLonGeoLocation).lon, left, right),
    clamp((gridCentroid.location as LatLonGeoLocation).lat, bottom, top),
  ];

  return {
    type: 'Point',
    coordinates: pointCoordinates,
  };
}
