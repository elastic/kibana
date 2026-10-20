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
  STEP_DURATION_FIELD,
  STEP_ID_FIELD,
  STEP_ITEMS_FIELD,
  UNIT_STATS_STREAM,
} from '../constants';
import { filterByIds, filterByUnitAndWindow, type StatsWindow } from './filters';

interface ProcessorStatsQueryParams {
  unitId: string;
  window: StatsWindow;
  /** Set only when the request pins a config hash. */
  configHash?: string;
  /** A non-empty list of processor ids. The telemetry calls them steps. */
  ids: string[];
}

const filterProcessors = (
  query: ComposerQuery,
  { ids, ...unitAndWindow }: ProcessorStatsQueryParams
) => filterByIds(filterByUnitAndWindow(query, unitAndWindow), STEP_ID_FIELD, ids);

/**
 * The rate of items coming in (direction `in`) per processor, from the time series.
 *
 * Processor failures are not queried: the collector ignores OTTL statement errors, so a failed
 * record still counts as a success, see
 * https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/52158. Once that is
 * fixed, add `failed_rate = SUM(RATE(items)) WHERE outcome == "failure"` here.
 */
export const buildProcessorRateQuery = (params: ProcessorStatsQueryParams): ComposerQuery =>
  filterProcessors(esql.ts(UNIT_STATS_STREAM), params).pipe`WHERE ${normalizeColumn(
    DIRECTION_FIELD
  )} == "in"`.pipe`STATS rate = SUM(RATE(${normalizeColumn(STEP_ITEMS_FIELD)}))
      BY step = ${normalizeColumn(STEP_ID_FIELD)}`;

/**
 * The items in and the time per item per processor over the window, from a plain `FROM` (a
 * plain sum inside `TS` is not a sum of deltas). `duration_per_item` is the duration sum over
 * the items in, null when there are none: an average of the duration histograms would be per
 * batch. `items` is a counter, so it is cast first.
 */
export const buildProcessorSumsQuery = (params: ProcessorStatsQueryParams): ComposerQuery =>
  filterProcessors(esql.from(UNIT_STATS_STREAM), params)
    .pipe`EVAL delta = TO_DOUBLE(${normalizeColumn(STEP_ITEMS_FIELD)})`
    .pipe`STATS items_in = SUM(delta) WHERE ${normalizeColumn(DIRECTION_FIELD)} == "in",
        duration_sum = SUM(${normalizeColumn(STEP_DURATION_FIELD)})
      BY step = ${normalizeColumn(STEP_ID_FIELD)}`
    .pipe`EVAL duration_per_item = CASE(items_in > 0, duration_sum / items_in)`;
