/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicMetricAgg } from './dynamic_block_schema';

/**
 * Measurement id for the absolute change of a field over the queried time range, whether the
 * field is a counter on one source and a gauge on another (Kubernetes container restarts: ECS
 * counter via `sum_increase`, OTel gauge via `sum_delta`). Closed set: do not widen without
 * product agreement; every other aggregation stays a singleton.
 */
export const CHANGE_OVER_RANGE_MEASUREMENT = 'change_over_range';

/**
 * Aggregations that share {@link CHANGE_OVER_RANGE_MEASUREMENT}: `sum_increase` for counters
 * (ES|QL `INCREASE` accepts counters only) and `sum_delta` for gauges (`DELTA` rejects counters).
 */
export const CHANGE_OVER_RANGE_AGGS: ReadonlySet<DynamicMetricAgg> = new Set([
  'sum_increase',
  'sum_delta',
]);

/**
 * The measurement class of an aggregation: a closed equivalence set, or the agg itself when it
 * stands alone. Same metric `name` across sources must share this class (and the same unit).
 */
export const getMetricMeasurementClass = (agg: DynamicMetricAgg): string =>
  CHANGE_OVER_RANGE_AGGS.has(agg) ? CHANGE_OVER_RANGE_MEASUREMENT : agg;

/** Whether two aggregations produce the same measurement for metric-name consistency. */
export const areMetricAggsEquivalent = (left: DynamicMetricAgg, right: DynamicMetricAgg): boolean =>
  getMetricMeasurementClass(left) === getMetricMeasurementClass(right);
