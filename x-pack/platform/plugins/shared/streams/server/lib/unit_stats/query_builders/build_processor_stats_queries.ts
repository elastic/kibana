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
  ESQL_MAX_ROWS,
  STATS_COLUMN,
  STEP_DURATION_FIELD,
  STEP_ID_FIELD,
  STEP_ITEMS_FIELD,
  STEP_PIPELINE_ID_FIELD,
  STEP_ROUTE_INDEX_FIELD,
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
 * The rate of items in (direction `in`) and the time per item of each instance of a processor
 * over the window, from a plain `FROM`. An instance is a pipeline and a route position, null for
 * the processors of the pipeline itself. The rate is the sum of items in over the window length,
 * in milliseconds because `DATE_DIFF` in seconds truncates. `avg_duration_per_item` is the
 * duration sum over the items in, as an average of the duration histograms would be per batch.
 * `items` is a counter, so it is cast first.
 *
 * Processor failures are not queried, see
 * https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/52158.
 */
export const buildProcessorSumsQuery = (params: ProcessorStatsQueryParams): ComposerQuery => {
  const direction = normalizeColumn(DIRECTION_FIELD);
  const stepItems = normalizeColumn(STEP_ITEMS_FIELD);
  const stepDuration = normalizeColumn(STEP_DURATION_FIELD);
  const stepId = normalizeColumn(STEP_ID_FIELD);
  const stepPipelineId = normalizeColumn(STEP_PIPELINE_ID_FIELD);
  const stepRouteIndex = normalizeColumn(STEP_ROUTE_INDEX_FIELD);
  const incomingRate = esql.col(STATS_COLUMN.incomingRate);
  const avgDurationPerItem = esql.col(STATS_COLUMN.avgDurationPerItem);
  const step = esql.col(STATS_COLUMN.step);
  const pipeline = esql.col(STATS_COLUMN.pipeline);
  const routeIndex = esql.col(STATS_COLUMN.routeIndex);
  const { start, end } = params.window;

  return filterProcessors(esql.from(UNIT_METRICS_STREAM), params)
    .pipe`EVAL delta = TO_DOUBLE(${stepItems})`
    .pipe`STATS sum_items_in = SUM(delta) WHERE ${direction} == "in",
        duration_sum = SUM(${stepDuration})
      BY ${step} = ${stepId}, ${pipeline} = ${stepPipelineId}, ${routeIndex} = ${stepRouteIndex}`
    .pipe`EVAL window_seconds = DATE_DIFF("milliseconds", ${start}, ${end}) / 1000.0`
    .pipe`EVAL ${incomingRate} = sum_items_in / window_seconds,
        ${avgDurationPerItem} = CASE(sum_items_in > 0, duration_sum / sum_items_in)`
    .pipe`KEEP ${step}, ${pipeline}, ${routeIndex}, ${incomingRate}, ${avgDurationPerItem}`
    .pipe`LIMIT ${ESQL_MAX_ROWS}`;
};
