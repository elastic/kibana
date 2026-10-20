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
  UNIT_STATS_STREAM,
} from '../constants';
import { filterByIds, filterByUnitAndWindow, type StatsWindow } from './filters';

interface DestinationStatsQueryParams {
  unitId: string;
  window: StatsWindow;
  /** Set only when the request pins a config hash. */
  configHash?: string;
  /** A non-empty list of destination ids. */
  ids: string[];
}

const filterDestinations = (
  query: ComposerQuery,
  { ids, ...unitAndWindow }: DestinationStatsQueryParams
) => filterByIds(filterByUnitAndWindow(query, unitAndWindow), DESTINATION_ID_FIELD, ids);

/**
 * Rate, failures rate and latency per destination, from the time series. `RATE` is not an
 * exact sum (it needs two samples per series and takes the first as its baseline), so the
 * series comes from `buildDestinationSumsQuery`. `failed_rate` counts every outcome except
 * `success`: 0 when there is a rate and no failures, null when there is no rate. Latency is
 * time per bulk request.
 */
export const buildDestinationRateQuery = (params: DestinationStatsQueryParams): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);

  return filterDestinations(esql.ts(UNIT_STATS_STREAM), params)
    .pipe`STATS rate = SUM(RATE(${items})),
        failed_rate = SUM(RATE(${items})) WHERE ${normalizeColumn(OUTCOME_FIELD)} != "success",
        latency = AVG(${normalizeColumn(DESTINATION_DURATION_FIELD)})
      BY id = ${normalizeColumn(DESTINATION_ID_FIELD)}`
    .pipe`EVAL failed_rate = CASE(rate IS NOT NULL AND failed_rate IS NULL, 0.0, failed_rate)`;
};

/**
 * Items per destination and time bucket, from a plain `FROM`: a plain sum inside `TS` is the
 * last value of each series, not a sum of deltas. `items` is a counter, so it is cast first.
 * Returns at most `ESQL_MAX_ROWS` rows (ids times buckets), silently, so the caller chunks ids.
 */
export const buildDestinationSumsQuery = ({
  bucketMs,
  ...params
}: DestinationStatsQueryParams & { bucketMs: number }): ComposerQuery => {
  const items = normalizeColumn(DESTINATION_ITEMS_FIELD);

  return filterDestinations(esql.from(UNIT_STATS_STREAM), params).pipe`WHERE ${items} IS NOT NULL`
    .pipe`EVAL delta = TO_DOUBLE(${items})`.pipe`STATS items = SUM(delta)
      BY id = ${normalizeColumn(DESTINATION_ID_FIELD)}, bucket = BUCKET(@timestamp, ${bucketMs} ms)`
    .pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
