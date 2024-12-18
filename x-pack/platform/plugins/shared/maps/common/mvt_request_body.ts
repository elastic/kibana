/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import rison from '@kbn/rison';
import type {
  SearchMvtRequest,
  SearchRequest,
} from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RENDER_AS } from './constants';

export function getAggsTileRequest({
  buffer,
  risonRequestBody,
  geometryFieldName,
  gridPrecision,
  hasLabels,
  index,
  renderAs = RENDER_AS.POINT,
  x,
  y,
  z,
}: {
  buffer: number;
  risonRequestBody: string;
  geometryFieldName: string;
  gridPrecision: number;
  hasLabels: boolean;
  index: string;
  renderAs: RENDER_AS;
  x: number;
  y: number;
  z: number;
}) {
  const requestBody = rison.decode(risonRequestBody) as SearchRequest['body'];
  if (!requestBody) {
    throw new Error('Required requestBody parameter not provided');
  }
  return {
    path: `/${encodeURIComponent(index)}/_mvt/${encodeURIComponent(
      geometryFieldName
    )}/${z}/${x}/${y}`,
    body: {
      buffer,
      size: 0, // no hits
      grid_precision: gridPrecision,
      exact_bounds: false,
      extent: 4096, // full resolution,
      query: requestBody.query,
      grid_agg: renderAs === RENDER_AS.HEX ? 'geohex' : 'geotile',
      grid_type: renderAs === RENDER_AS.GRID || renderAs === RENDER_AS.HEX ? 'grid' : 'centroid',
      aggs: requestBody.aggs,
      runtime_mappings: requestBody.runtime_mappings,
      with_labels: hasLabels,
    } as SearchMvtRequest['body'],
  };
}

export function getHitsTileRequest({
  buffer,
  risonRequestBody,
  geometryFieldName,
  hasLabels,
  index,
  x,
  y,
  z,
}: {
  buffer: number;
  risonRequestBody: string;
  geometryFieldName: string;
  hasLabels: boolean;
  index: string;
  x: number;
  y: number;
  z: number;
}) {
  const requestBody = rison.decode(risonRequestBody) as SearchRequest['body'];
  if (!requestBody) {
    throw new Error('Required requestBody parameter not provided');
  }
  const size = typeof requestBody.size === 'number' ? requestBody.size : 10000;
  const tileRequestBody = {
    buffer,
    grid_precision: 0, // no aggs
    exact_bounds: true,
    extent: 4096, // full resolution,
    query: requestBody.query,
    runtime_mappings: requestBody.runtime_mappings,
    // Number of hits matching the query to count accurately
    // Used to notify users of truncated results
    track_total_hits: size + 1,
    // Maximum number of features to return in the hits layer
    // Used to fetch number of hits that correspondes with track_total_hits
    size,
    with_labels: hasLabels,
  } as SearchMvtRequest['body'];
  if (requestBody.fields) {
    // @ts-expect-error SearchRequest['body'].fields and SearchMvtRequest['body'].fields types do not allign, even though they do in implemenation
    tileRequestBody.fields = requestBody.fields;
  }
  if (requestBody.sort) {
    tileRequestBody!.sort = requestBody.sort;
  }
  return {
    path: `/${encodeURIComponent(index)}/_mvt/${encodeURIComponent(
      geometryFieldName
    )}/${z}/${x}/${y}`,
    body: tileRequestBody,
  };
}
