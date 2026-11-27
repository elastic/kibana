/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLSingleAstItem } from '@elastic/esql/types';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  DESTINATION_DURATION_FIELD,
  DESTINATION_ID_FIELD,
  DESTINATION_ITEMS_FIELD,
  ESQL_MAX_ROWS,
  FAILURE_STORE_FIELD,
  FAILURE_STORE_OUTCOME,
  FAILURE_STORE_USED,
  OUTCOME_FIELD,
  STATS_COLUMN,
  UNIT_METRICS_STREAM,
} from '../constants';
import {
  filterByIds,
  filterByUnitAndWindow,
  nullifyUnmappedColumns,
  type StatsQueryBaseParams,
} from './filters';

export interface DestinationStatsQueryParams extends StatsQueryBaseParams {
  /** A non-empty list of destination ids. */
  ids: string[];
}

/** Keeps the documents of the named destinations of one unit in the window. */
export const filterDestinations = (
  query: ComposerQuery,
  { ids, ...unitAndWindow }: DestinationStatsQueryParams
) =>
  nullifyUnmappedColumns(
    filterByIds(filterByUnitAndWindow(query, unitAndWindow), DESTINATION_ID_FIELD, ids)
  );

/**
 * Keeps an items row that is not a failure store row. The exporter reports a rejected document
 * twice, under its `failed_*` outcome and under `failure_store`, so a sum of items that is not an
 * error rate leaves the second one out. A row with no outcome stays, because `null != "x"` is null.
 */
export const countsItemOnce = (): ESQLSingleAstItem => {
  const outcome = normalizeColumn(OUTCOME_FIELD);

  return esql.exp`${outcome} IS NULL OR ${outcome} != ${FAILURE_STORE_OUTCOME}`;
};

/**
 * Keeps an items row that is one failure. Every outcome except `success` is, with one exception.
 *
 * The exception is a `failure_store` row of a document that did not go to the failure store
 * (`not_enabled` or `failed`), because the exporter also reported that document under its
 * `failed_*` outcome. A `used` row stays, because that document was also reported as a success.
 *
 * So a failed item counts once: the `failed_*` outcomes plus the `used` rows. A row with no outcome
 * does not count.
 */
export const countsFailureOnce = (): ESQLSingleAstItem => {
  const outcome = normalizeColumn(OUTCOME_FIELD);
  const failureStore = normalizeColumn(FAILURE_STORE_FIELD);

  return esql.exp`${outcome} != "success" AND (${outcome} != ${FAILURE_STORE_OUTCOME} OR ${failureStore} == ${FAILURE_STORE_USED})`;
};

/**
 * Rate, failed rate and latency per destination, from a plain `FROM`. A rate is the exact sum of
 * items over the time from where the first delta in the window starts (a document is a delta from
 * `start_timestamp` to `@timestamp`) to the end of the window, so a destination that started inside
 * the window is not diluted and the first delta's own interval is counted. The time is taken in
 * milliseconds because `DATE_DIFF` in seconds truncates. The incoming rate leaves out `failure_store`
 * rows, see `countsItemOnce`. `failed_rate` counts each failed item once, see `countsFailureOnce`:
 * 0 when there are items and no failures, null when there are no items. `AVG` of the duration
 * histograms is the mean of all observations. `items` is a counter, so it is cast first.
 */
export const buildDestinationRateQuery = (params: DestinationStatsQueryParams): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);
  const duration = normalizeColumn(DESTINATION_DURATION_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const incomingRate = esql.col(STATS_COLUMN.incomingRate);
  const failedRate = esql.col(STATS_COLUMN.failedRate);
  const avgLatency = esql.col(STATS_COLUMN.avgLatency);
  const id = esql.col(STATS_COLUMN.id);
  const { end } = params.window;

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`EVAL delta = TO_DOUBLE(${items})`
    .pipe`STATS sum_items = SUM(delta) WHERE ${countsItemOnce()},
        failed_items = SUM(delta) WHERE ${countsFailureOnce()},
        ${avgLatency} = AVG(${duration}),
        covered_from = MIN(start_timestamp)
      BY ${id} = ${destinationId}`
    .pipe`EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, ${end}) / 1000.0`
    .pipe`EVAL ${incomingRate} = sum_items / window_seconds,
        ${failedRate} = CASE(sum_items IS NOT NULL, COALESCE(failed_items, 0.0) / window_seconds)`
    .pipe`KEEP ${id}, ${incomingRate}, ${failedRate}, ${avgLatency}`;
};

/**
 * Items per destination and time bucket, ordered by bucket, from a plain `FROM`. `items` is a
 * counter, so it is cast first. `failure_store` rows are left out, see `countsItemOnce`.
 * Returns at most `ESQL_MAX_ROWS` rows (ids times buckets) and truncates silently. A request
 * names a bounded number of ids and `bucketMs` gives at most `SERIES_MAX_BUCKETS` buckets, so
 * the result always fits.
 */
export const buildDestinationSumsQuery = ({
  bucketMs,
  ...params
}: DestinationStatsQueryParams & { bucketMs: number }): ComposerQuery => {
  const destinationItems = normalizeColumn(DESTINATION_ITEMS_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const sumItems = esql.col(STATS_COLUMN.sumItems);
  const id = esql.col(STATS_COLUMN.id);
  const bucket = esql.col(STATS_COLUMN.bucket);

  return filterDestinations(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`WHERE ${destinationItems} IS NOT NULL`.pipe`WHERE ${countsItemOnce()}`
    .pipe`EVAL delta = TO_DOUBLE(${destinationItems})`.pipe`STATS ${sumItems} = SUM(delta)
      BY ${id} = ${destinationId}, ${bucket} = BUCKET(@timestamp, ${bucketMs} ms)`
    .pipe`SORT ${bucket}`.pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
