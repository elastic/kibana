/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  COLLECTION_NAME_FIELD,
  DESTINATION_ID_FIELD,
  DESTINATION_ITEMS_FIELD,
  HTTP_STATUS_CODE_FIELD,
  STATS_COLUMN,
  UNIT_METRICS_STREAM,
} from '../constants';
import {
  filterDestinations,
  type DestinationStatsQueryParams,
} from './build_destination_stats_queries';

/**
 * The authentication and authorization rates of Elasticsearch destinations. The exporter reports
 * a rejected document with the HTTP status code of the response, so a 401 is an authentication
 * failure and a 403 an authorization failure. Other destination types report their failures
 * another way and have their own queries.
 */

/**
 * The authentication (401) and authorization (403) rate per destination, from a plain `FROM`. A
 * rate is the sum of items with that status over the same time as the rates of
 * `buildDestinationRateQuery`: from where the first delta in the window starts to the end of the
 * window, in milliseconds. It filters on the status code, not the outcome, so other 4xx failures
 * stay in the failed rate only. 0 when there are items and none was rejected with that status,
 * null when there are no items.
 */
export const buildElasticsearchAuthFailureRatesQuery = (
  params: DestinationStatsQueryParams
): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);
  const statusCode = normalizeColumn(HTTP_STATUS_CODE_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const authenticationRate = esql.col(STATS_COLUMN.authenticationRate);
  const authorizationRate = esql.col(STATS_COLUMN.authorizationRate);
  const id = esql.col(STATS_COLUMN.id);
  const { end } = params.window;

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`EVAL delta = TO_DOUBLE(${items})`.pipe`STATS sum_items = SUM(delta),
        authentication_items = SUM(delta) WHERE ${statusCode} == 401,
        authorization_items = SUM(delta) WHERE ${statusCode} == 403,
        covered_from = MIN(start_timestamp)
      BY ${id} = ${destinationId}`
    .pipe`EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, ${end}) / 1000.0`
    .pipe`EVAL ${authenticationRate} = CASE(sum_items IS NOT NULL, COALESCE(authentication_items, 0.0) / window_seconds),
        ${authorizationRate} = CASE(sum_items IS NOT NULL, COALESCE(authorization_items, 0.0) / window_seconds)`
    .pipe`KEEP ${id}, ${authenticationRate}, ${authorizationRate}`;
};

/**
 * The authentication and authorization rates of each destination, split by collection (the data
 * stream or index that the exporter reported), from a plain `FROM`. It is for destinations that the
 * rates query showed have such failures, so one row per destination and collection that has any.
 * The time is the destination's, not the collection's: `INLINE STATS` finds the first delta of the
 * destination over all its documents, before the filters, so each collection rate is a part of the
 * rates of `buildElasticsearchAuthFailureRatesQuery`. A failure of a whole request has no
 * collection, so its items are in the rates query and not here. A collection with failures of one
 * status only has a null rate for the other.
 */
export const buildElasticsearchAuthFailureCollectionsQuery = (
  params: DestinationStatsQueryParams
): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);
  const statusCode = normalizeColumn(HTTP_STATUS_CODE_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const collectionName = normalizeColumn(COLLECTION_NAME_FIELD);
  const authenticationRate = esql.col(STATS_COLUMN.authenticationRate);
  const authorizationRate = esql.col(STATS_COLUMN.authorizationRate);
  const id = esql.col(STATS_COLUMN.id);
  const collection = esql.col(STATS_COLUMN.collection);
  const { end } = params.window;

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`EVAL delta = TO_DOUBLE(${items})`
    .pipe`INLINE STATS covered_from = MIN(start_timestamp) BY ${destinationId}`
    .pipe`WHERE ${statusCode} IN (401, 403) AND ${collectionName} IS NOT NULL`
    .pipe`STATS authentication_items = SUM(delta) WHERE ${statusCode} == 401,
        authorization_items = SUM(delta) WHERE ${statusCode} == 403,
        covered_from = MIN(covered_from)
      BY ${id} = ${destinationId}, ${collection} = ${collectionName}`
    .pipe`EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, ${end}) / 1000.0`
    .pipe`EVAL ${authenticationRate} = authentication_items / window_seconds,
        ${authorizationRate} = authorization_items / window_seconds`
    .pipe`KEEP ${id}, ${collection}, ${authenticationRate}, ${authorizationRate}`;
};
