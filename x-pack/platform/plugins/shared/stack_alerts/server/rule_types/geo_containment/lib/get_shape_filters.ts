/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fastIsEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';
import { ElasticsearchClient } from '@kbn/core/server';
import type { BoundariesRequestMeta } from '../types';
import { getQueryDsl } from './get_query_dsl';

interface BoundaryHit {
  _index: string;
  _id: string;
  fields?: Record<string, unknown[]>;
}

// Consider dynamically obtaining from config?
const MAX_SHAPES_QUERY_SIZE = 10000;

export function canSkipBoundariesFetch(
  requestMeta: BoundariesRequestMeta,
  prevRequestMeta?: BoundariesRequestMeta
) {
  return prevRequestMeta
    ? fastIsEqual(
        [
          requestMeta.geoField,
          requestMeta.boundaryIndexTitle,
          requestMeta.boundaryGeoField,
          requestMeta.boundaryNameField,
          requestMeta.boundaryIndexQuery,
        ],
        [
          prevRequestMeta.geoField,
          prevRequestMeta.boundaryIndexTitle,
          prevRequestMeta.boundaryGeoField,
          prevRequestMeta.boundaryNameField,
          prevRequestMeta.boundaryIndexQuery,
        ]
      )
    : false;
}

export async function getShapeFilters(
  requestMeta: BoundariesRequestMeta,
  esClient: ElasticsearchClient
) {
  const { geoField, boundaryIndexTitle, boundaryGeoField, boundaryNameField, boundaryIndexQuery } =
    requestMeta;

  let boundaryData;
  try {
    boundaryData = await esClient.search<Record<string, BoundaryHit>>({
      index: boundaryIndexTitle,
      body: {
        size: MAX_SHAPES_QUERY_SIZE,
        _source: false,
        fields: boundaryNameField ? [boundaryNameField] : [],
        ...(boundaryIndexQuery ? { query: getQueryDsl(boundaryIndexQuery) } : {}),
      },
    });
  } catch (e) {
    throw new Error(
      i18n.translate('xpack.stackAlerts.geoContainment.boundariesFetchError', {
        defaultMessage: 'Unable to fetch tracking containment boundaries, error: {error}',
        values: { error: e.message },
      })
    );
  }

  const hits = boundaryData?.hits?.hits;
  if (!hits || hits.length === 0) {
    const noBoundariesMsg = i18n.translate('xpack.stackAlerts.geoContainment.noBoundariesError', {
      defaultMessage:
        'No tracking containtment boundaries found. Ensure index, "{index}", has documents.',
      values: { index: boundaryIndexTitle },
    });

    const adjustQueryMsg = boundaryIndexQuery
      ? i18n.translate('xpack.stackAlerts.geoContainment.adjustQuery', {
          defaultMessage: 'Adjust query, "{query}" to match documents.',
          values: { query: boundaryIndexQuery.query as string },
        })
      : null;

    throw new Error(adjustQueryMsg ? `${noBoundariesMsg} ${adjustQueryMsg}` : noBoundariesMsg);
  }

  const filters: Record<string, unknown> = {};
  const shapesIdsNamesMap: Record<string, unknown> = {};
  for (let i = 0; i < hits.length; i++) {
    const boundaryHit = hits[i] as BoundaryHit;
    filters[boundaryHit._id] = {
      geo_shape: {
        [geoField]: {
          indexed_shape: {
            index: boundaryHit._index,
            id: boundaryHit._id,
            path: boundaryGeoField,
          },
        },
      },
    };
    if (
      boundaryNameField &&
      boundaryHit.fields &&
      boundaryHit.fields[boundaryNameField] &&
      boundaryHit.fields[boundaryNameField].length
    ) {
      // fields API always returns an array, grab first value
      shapesIdsNamesMap[boundaryHit._id] = boundaryHit.fields[boundaryNameField][0];
    }
  }

  return {
    shapesFilters: filters,
    shapesIdsNamesMap,
  };
}
