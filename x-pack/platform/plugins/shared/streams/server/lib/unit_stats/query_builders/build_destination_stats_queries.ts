/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  DESTINATION_DURATION_FIELD,
  DESTINATION_ID_FIELD,
  DESTINATION_ITEMS_FIELD,
  ESQL_MAX_ROWS,
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

interface DestinationStatsQueryParams extends StatsQueryBaseParams {
  /** A non-empty list of destination ids. */
  ids: string[];
}

const filterDestinations = (
  query: ComposerQuery,
  { ids, ...unitAndWindow }: DestinationStatsQueryParams
) =>
  nullifyUnmappedColumns(
    filterByIds(filterByUnitAndWindow(query, unitAndWindow), DESTINATION_ID_FIELD, ids)
  );

/**
 * Rate, failures rate and latency per destination, from the time series. `RATE` is not an
 * exact sum (it needs two samples per series and takes the first as its baseline), so the
 * series comes from `buildDestinationSumsQuery`. `failed_rate` counts every outcome except
 * `success`: 0 when there is a rate and no failures, null when there is no rate.
 */
export const buildDestinationRateQuery = (params: DestinationStatsQueryParams): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);
  const duration = normalizeColumn(DESTINATION_DURATION_FIELD);
  const outcome = normalizeColumn(OUTCOME_FIELD);
  const destinationId = normalizeColumn(DESTINATION_ID_FIELD);
  const incomingRate = esql.col(STATS_COLUMN.incomingRate);
  const failedRate = esql.col(STATS_COLUMN.failedRate);
  const avgLatency = esql.col(STATS_COLUMN.avgLatency);
  const id = esql.col(STATS_COLUMN.id);

  return filterDestinations(esql.ts(UNIT_METRICS_STREAM), params)
    .pipe`STATS ${incomingRate} = SUM(RATE(${items})),
        ${failedRate} = SUM(RATE(${items})) WHERE ${outcome} != "success",
        ${avgLatency} = AVG(${duration})
      BY ${id} = ${destinationId}`
    .pipe`EVAL ${failedRate} = CASE(${incomingRate} IS NOT NULL AND ${failedRate} IS NULL, 0.0, ${failedRate})`;
};

/**
 * Items per destination and time bucket, ordered by bucket, from a plain `FROM`: a plain sum
 * inside `TS` is the last value of each series, not a sum of deltas. `items` is a counter, so
 * it is cast first.
 * Returns at most `ESQL_MAX_ROWS` rows (ids times buckets), silently, so the caller chunks ids.
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
    .pipe`WHERE ${destinationItems} IS NOT NULL`.pipe`EVAL delta = TO_DOUBLE(${destinationItems})`
    .pipe`STATS ${sumItems} = SUM(delta)
      BY ${id} = ${destinationId}, ${bucket} = BUCKET(@timestamp, ${bucketMs} ms)`
    .pipe`SORT ${bucket}`.pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
