/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  AggregationsExtendedBounds,
  AggregationsFieldDateMath,
} from '@elastic/elasticsearch/lib/api/types';
import {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
} from './rule_events_metric_series';

export const RULES_BUCKET_SIZE = 1000;

/** Source metric series is always 1 closed-minute point; analysis must match. */
export const METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL = '1m';

export {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
  METRIC_SERIES_RUNTIME_MAPPINGS,
} from './rule_events_metric_series';

export function buildChangePointHistogramBounds(
  lookback: string,
  bucketInterval: string = METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL
): AggregationsExtendedBounds<AggregationsFieldDateMath> {
  return { min: lookback, max: `now-${bucketInterval}` };
}

/**
 * DSL equivalent of:
 *
 * ```esql
 * | EVAL metric_value = TO_INTEGER(FIELD_EXTRACT(data, "metric_value"))
 * | EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(data, "bucket")))
 * | STATS metric_value = MAX(metric_value) BY bucket
 * | CHANGE_POINT metric_value ON bucket
 * ```
 *
 * Analysis interval is fixed at 1m (source resolution). Missing minutes are
 * zero-filled via `extended_bounds` + a `bucket_script` over `_count` — the
 * same density contract as the pre-metric-series `over_time>_count` path.
 * (`change_point.gap_policy` alone is not reliable for null max metrics.)
 */
export function buildChangePointTimeSeriesAggs(
  _bucketInterval: string,
  {
    extendedBounds,
  }: {
    extendedBounds: AggregationsExtendedBounds<AggregationsFieldDateMath>;
  }
): Record<string, AggregationsAggregationContainer> {
  return {
    over_time: {
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
        min_doc_count: 0,
        extended_bounds: extendedBounds,
      },
      aggs: {
        // Collapse overlapping MATCH recounts for the same source minute.
        metric_value_raw: {
          max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
        },
        // `_count` is always present (0 on empty extended_bounds buckets). Use it
        // to force a numeric series — null `max` alone is skipped by change_point
        // and yields `indeterminable` when fewer than 22 non-null points remain.
        metric_value: {
          bucket_script: {
            buckets_path: {
              docs: '_count',
              val: 'metric_value_raw',
            },
            script:
              'params.docs == 0 || params.val == null || Double.isNaN(params.val) ? 0.0 : params.val',
            gap_policy: 'insert_zeros',
          },
        },
      },
    },
    change_points: {
      change_point: {
        buckets_path: 'over_time>metric_value',
      },
    },
  };
}
