/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery } from '@elastic/esql';
import { normalizeColumn } from '../../streams/helpers/esql';
import {
  DIRECTION_FIELD,
  STATS_COLUMN,
  STEP_DURATION_FIELD,
  STEP_ID_FIELD,
  STEP_ITEMS_FIELD,
  UNIT_METRICS_STREAM,
} from '../constants';
import {
  filterByIds,
  filterByUnitAndWindow,
  nullifyUnmappedColumns,
  type StatsQueryBaseParams,
} from './filters';

interface ProcessorStatsQueryParams extends StatsQueryBaseParams {
  /** A non-empty list of processor ids. The telemetry calls them steps. */
  ids: string[];
}

const filterProcessors = (
  query: ComposerQuery,
  { ids, ...unitAndWindow }: ProcessorStatsQueryParams
) =>
  nullifyUnmappedColumns(
    filterByIds(filterByUnitAndWindow(query, unitAndWindow), STEP_ID_FIELD, ids)
  );

/**
 * The rate of items coming in (direction `in`) per processor, from the time series.
 *
 * Processor failures are not queried: the collector ignores OTTL statement errors, so a failed
 * record still counts as a success, see
 * https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/52158. Once that is
 * fixed, add `failed_rate = SUM(RATE(items)) WHERE outcome == "failure"` here.
 */
export const buildProcessorRateQuery = (params: ProcessorStatsQueryParams): ComposerQuery => {
  const direction = normalizeColumn(DIRECTION_FIELD);
  const stepItems = normalizeColumn(STEP_ITEMS_FIELD);
  const stepId = normalizeColumn(STEP_ID_FIELD);
  const incomingRate = esql.col(STATS_COLUMN.incomingRate);
  const step = esql.col(STATS_COLUMN.step);

  return filterProcessors(esql.ts(UNIT_METRICS_STREAM), params).pipe`WHERE ${direction} == "in"`
    .pipe`STATS ${incomingRate} = SUM(RATE(${stepItems})) BY ${step} = ${stepId}`;
};

/**
 * The items in and the time per item per processor over the window, from a plain `FROM` (a
 * plain sum inside `TS` is not a sum of deltas). `avg_duration_per_item` is the duration sum over
 * the items in, null when there are none: an average of the duration histograms would be per
 * batch. `items` is a counter, so it is cast first.
 */
export const buildProcessorSumsQuery = (params: ProcessorStatsQueryParams): ComposerQuery => {
  const direction = normalizeColumn(DIRECTION_FIELD);
  const stepItems = normalizeColumn(STEP_ITEMS_FIELD);
  const stepDuration = normalizeColumn(STEP_DURATION_FIELD);
  const stepId = normalizeColumn(STEP_ID_FIELD);
  const sumItemsIn = esql.col(STATS_COLUMN.sumItemsIn);
  const avgDurationPerItem = esql.col(STATS_COLUMN.avgDurationPerItem);
  const step = esql.col(STATS_COLUMN.step);

  return filterProcessors(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`EVAL delta = TO_DOUBLE(${stepItems})`
    .pipe`STATS ${sumItemsIn} = SUM(delta) WHERE ${direction} == "in",
        duration_sum = SUM(${stepDuration})
      BY ${step} = ${stepId}`
    .pipe`EVAL ${avgDurationPerItem} = CASE(${sumItemsIn} > 0, duration_sum / ${sumItemsIn})`;
};
