/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicMetricAgg } from './dynamic_block_schema';

/**
 * Measurement id for a cumulative count that may be a counter rate on one source and a gauge
 * level on another (Kubernetes container restarts: ECS `sum_rate`, OTel `last`). Closed set —
 * do not widen without product agreement; `avg`/`max` and the other rate outers stay singletons.
 */
export const CUMULATIVE_COUNT_MEASUREMENT = 'cumulative_count';

/**
 * Aggregations that share {@link CUMULATIVE_COUNT_MEASUREMENT}. `sum_rate` for counters;
 * `last` for gauges that already store the cumulative level. Future `increase` / `delta` belong
 * here once the schema accepts them.
 */
export const CUMULATIVE_COUNT_AGGS: ReadonlySet<DynamicMetricAgg> = new Set(['sum_rate', 'last']);

/**
 * The measurement class of an aggregation: a closed equivalence set, or the agg itself when it
 * stands alone. Same metric `name` across sources must share this class (and the same unit).
 */
export const getMetricMeasurementClass = (agg: DynamicMetricAgg): string =>
  CUMULATIVE_COUNT_AGGS.has(agg) ? CUMULATIVE_COUNT_MEASUREMENT : agg;

/** Whether two aggregations produce the same measurement for metric-name consistency. */
export const areMetricAggsEquivalent = (left: DynamicMetricAgg, right: DynamicMetricAgg): boolean =>
  getMetricMeasurementClass(left) === getMetricMeasurementClass(right);
