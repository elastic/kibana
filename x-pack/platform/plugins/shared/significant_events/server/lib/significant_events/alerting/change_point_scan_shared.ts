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
  METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
  METRIC_SERIES_MAX_WRITE_DELAY,
} from '../rules/metric_series_contract';
import {
  getAnalysisWriteTimeLookback,
  getDurationMinutes,
  parseLookbackMinutes,
} from '../rules/schedule';
import {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
} from './rule_events_metric_series';

export const RULES_BUCKET_SIZE = 1000;

export { METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL } from '../rules/metric_series_contract';
export {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
  METRIC_SERIES_RUNTIME_MAPPINGS,
} from './rule_events_metric_series';

export interface ChangePointHistogramWindow {
  /** Source-bucket bounds (extended + hard). Ends at the reliable write horizon. */
  bounds: AggregationsExtendedBounds<AggregationsFieldDateMath>;
  /** Write-time `@timestamp` prune that covers every source minute in `bounds`. */
  writeTimeLookback: string;
}

/**
 * Analysis window for change_point.
 *
 * `lookback` (`now-40m`) is the analysis *duration*. The series ends at
 * `now - MAX_WRITE_DELAY` so not-yet-written closed minutes are excluded, and
 * starts `duration` earlier. Identical `extended_bounds` + `hard_bounds` keep
 * empty minutes zero-filled without letting out-of-window docs stretch the
 * histogram. The write-time filter is widened to the same source span.
 */
export function buildChangePointHistogramWindow(lookback: string): ChangePointHistogramWindow {
  const lookbackMinutes = parseLookbackMinutes(lookback);
  const writeDelayMinutes = getDurationMinutes(METRIC_SERIES_MAX_WRITE_DELAY);
  const sourceMin = `now-${lookbackMinutes + writeDelayMinutes}m`;
  const sourceMax = `now-${METRIC_SERIES_MAX_WRITE_DELAY}`;

  return {
    bounds: { min: sourceMin, max: sourceMax },
    writeTimeLookback: getAnalysisWriteTimeLookback(lookbackMinutes),
  };
}

/**
 * DSL equivalent of:
 *
 * ```esql
 * | EVAL metric_value = TO_LONG(FIELD_EXTRACT(data, "metric_value"))
 * | EVAL bucket = TO_DATETIME(TO_LONG(FIELD_EXTRACT(data, "bucket")))
 * | STATS minute_value = MAX(metric_value) BY source_minute = DATE_TRUNC(1 minute, bucket)
 * | STATS metric_value = SUM(minute_value) BY bucket = BUCKET(source_minute, <interval>)
 * | CHANGE_POINT metric_value ON bucket
 * ```
 *
 * Outer interval is the configured analysis bucket size. Overlapping rule
 * re-emits are collapsed with per-minute MAX before SUM into the outer bucket.
 * Empty outer buckets are zero-filled (`extended_bounds` + `_count` script) so
 * change_point always sees a dense numeric series (needs ≥22 non-null points).
 */
export function buildChangePointTimeSeriesAggs({
  bucketInterval,
  bounds,
}: {
  bucketInterval: string;
  bounds: AggregationsExtendedBounds<AggregationsFieldDateMath>;
}): Record<string, AggregationsAggregationContainer> {
  return {
    over_time: {
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: bucketInterval,
        min_doc_count: 0,
        extended_bounds: bounds,
        hard_bounds: bounds,
      },
      aggs: {
        // Deduplicate overlapping MATCH recounts at source-minute resolution.
        per_minute: {
          date_histogram: {
            field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
            fixed_interval: METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
            min_doc_count: 1,
          },
          aggs: {
            minute_value: {
              max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
            },
          },
        },
        metric_value_raw: {
          sum_bucket: {
            buckets_path: 'per_minute>minute_value',
          },
        },
        // `_count` is always present (0 on empty extended_bounds buckets). Use it
        // to force a numeric series — null sum_bucket alone is skipped by
        // change_point and yields `indeterminable` when fewer than
        // MIN_SIG_EVENTS_CHANGE_POINT_BUCKETS non-null points remain.
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
