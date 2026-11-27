/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  DESTINATION_ID_FIELD,
  DESTINATION_ITEMS_FIELD,
  ESQL_MAX_ROWS,
  HTTP_STATUS_CODE_FIELD,
  STATS_COLUMN,
  UNIT_METRICS_STREAM,
} from '../constants';
import {
  countsFailureOnce,
  countsItemOnce,
  filterDestinations,
  type DestinationStatsQueryParams,
} from './build_destination_stats_queries';

/**
 * What Elasticsearch destinations attempted and what failed, per destination and time bucket, from a
 * plain `FROM`, for a chart of delivery. All four are counts of items:
 * - `total_items` leaves out the `failure_store` rows, as the incoming rate does, see `countsItemOnce`
 * - `failed_items` counts each failed item once, as the failed rate does, see `countsFailureOnce`
 * - `authentication_items` and `authorization_items` are the items rejected with a 401 and a 403,
 *   picked by status code as in `buildElasticsearchAuthFailureRatesQuery`
 *
 * So the authentication and authorization counts are parts of the failed count, which is a part of
 * the total, as the rates are. A count is null for a bucket that has no such items, and a bucket
 * that has no items at all has no row.
 *
 * It returns at most `ESQL_MAX_ROWS` rows (ids times buckets) and truncates silently. A request
 * names a bounded number of ids and `bucketMs` gives at most `SERIES_MAX_BUCKETS` buckets, so the
 * result always fits. It has no breakdown, which would not fit.
 */
export const buildElasticsearchDeliverySeriesQuery = ({
  bucketMs,
  ...params
}: DestinationStatsQueryParams & { bucketMs: number }): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);
  const statusCode = normalizeColumn(HTTP_STATUS_CODE_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const totalItems = esql.col(STATS_COLUMN.totalItems);
  const failedItems = esql.col(STATS_COLUMN.failedItems);
  const authenticationItems = esql.col(STATS_COLUMN.authenticationItems);
  const authorizationItems = esql.col(STATS_COLUMN.authorizationItems);
  const id = esql.col(STATS_COLUMN.id);
  const bucket = esql.col(STATS_COLUMN.bucket);

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params).pipe`WHERE ${items} IS NOT NULL`
    .pipe`EVAL delta = TO_DOUBLE(${items})`
    .pipe`STATS ${totalItems} = SUM(delta) WHERE ${countsItemOnce()},
        ${failedItems} = SUM(delta) WHERE ${countsFailureOnce()},
        ${authenticationItems} = SUM(delta) WHERE ${statusCode} == 401,
        ${authorizationItems} = SUM(delta) WHERE ${statusCode} == 403
      BY ${id} = ${destinationId}, ${bucket} = BUCKET(@timestamp, ${bucketMs} ms)`
    .pipe`SORT ${bucket}`.pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
