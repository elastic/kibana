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

export {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
  METRIC_SERIES_RUNTIME_MAPPINGS,
} from './rule_events_metric_series';

export function buildChangePointHistogramBounds(
  lookback: string,
  bucketInterval: string
): AggregationsExtendedBounds<AggregationsFieldDateMath> {
  return { min: lookback, max: `now-${bucketInterval}` };
}

/**
 * Coalesce a possibly-null sibling metric to 0. Empty `extended_bounds`
 * histogram buckets have no docs, so max/sum_bucket return null — and
 * `change_point` then reports `indeterminable` (not enough non-null points).
 * The pre-metric-series scan used `over_time>_count`, which is 0 for empty
 * buckets; this restores that dense series contract for metric volumes.
 */
function zeroFilledVolume(
  bucketsPath: string
): Record<string, AggregationsAggregationContainer> {
  return {
    volume: {
      bucket_script: {
        buckets_path: { v: bucketsPath },
        script: 'params.v != null ? params.v : 0',
        gap_policy: 'insert_zeros',
      },
    },
  };
}

/**
 * Volume over source `bucket` time, then change_point on that series.
 *
 * - Analysis interval `1m`: MAX(metric_value) collapses overlapping MATCH
 *   recounts for the same minute.
 * - Coarser intervals (e.g. `5m`): MAX per source minute, then SUM into the
 *   analysis bucket.
 * - Empty analysis buckets are zero-filled so change_point always sees the
 *   full extended_bounds width (same density contract as the old `_count` path).
 */
export function buildChangePointTimeSeriesAggs(
  bucketInterval: string,
  {
    extendedBounds,
  }: {
    extendedBounds: AggregationsExtendedBounds<AggregationsFieldDateMath>;
  }
): Record<string, AggregationsAggregationContainer> {
  const isMinuteAnalysis = bucketInterval === '1m';

  const volumeAggs: Record<string, AggregationsAggregationContainer> = isMinuteAnalysis
    ? {
        volume_raw: {
          max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
        },
        ...zeroFilledVolume('volume_raw'),
      }
    : {
        by_minute: {
          date_histogram: {
            field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
            fixed_interval: '1m',
            min_doc_count: 1,
          },
          aggs: {
            minute_max: {
              max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
            },
          },
        },
        volume_raw: {
          sum_bucket: {
            buckets_path: 'by_minute>minute_max',
            gap_policy: 'insert_zeros',
          },
        },
        ...zeroFilledVolume('volume_raw'),
      };

  return {
    over_time: {
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: bucketInterval,
        min_doc_count: 0,
        extended_bounds: extendedBounds,
      },
      aggs: volumeAggs,
    },
    change_points: { change_point: { buckets_path: 'over_time>volume' } },
  };
}
