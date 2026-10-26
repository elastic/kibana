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
 * The rate of items in (direction `in`) and the time per item per processor over the window, from
 * a plain `FROM`. The rate is the exact sum of items in over the length of the window. A sum of
 * per-series `RATE`s would count a series that ends and one that starts inside the window both
 * in full. The window length is taken in milliseconds: `DATE_DIFF` in seconds truncates, which
 * skews short windows. `avg_duration_per_item` is the duration sum over the items in, null when there are
 * none: an average of the duration histograms would be per batch. `items` is a counter, so it is
 * cast first.
 *
 * Processor failures are not queried: the collector ignores OTTL statement errors, so a failed
 * record still counts as a success, see
 * https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/52158. Once that is
 * fixed, add a failed rate from `SUM(delta) WHERE outcome == "failure"` here.
 */
export const buildProcessorSumsQuery = (params: ProcessorStatsQueryParams): ComposerQuery => {
  const direction = normalizeColumn(DIRECTION_FIELD);
  const stepItems = normalizeColumn(STEP_ITEMS_FIELD);
  const stepDuration = normalizeColumn(STEP_DURATION_FIELD);
  const stepId = normalizeColumn(STEP_ID_FIELD);
  const incomingRate = esql.col(STATS_COLUMN.incomingRate);
  const avgDurationPerItem = esql.col(STATS_COLUMN.avgDurationPerItem);
  const step = esql.col(STATS_COLUMN.step);
  const { start, end } = params.window;

  return filterProcessors(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`EVAL delta = TO_DOUBLE(${stepItems})`
    .pipe`STATS sum_items_in = SUM(delta) WHERE ${direction} == "in",
        duration_sum = SUM(${stepDuration})
      BY ${step} = ${stepId}`
    .pipe`EVAL window_seconds = DATE_DIFF("milliseconds", ${start}, ${end}) / 1000.0`
    .pipe`EVAL ${incomingRate} = sum_items_in / window_seconds,
        ${avgDurationPerItem} = CASE(sum_items_in > 0, duration_sum / sum_items_in)`
    .pipe`KEEP ${step}, ${incomingRate}, ${avgDurationPerItem}`;
};
