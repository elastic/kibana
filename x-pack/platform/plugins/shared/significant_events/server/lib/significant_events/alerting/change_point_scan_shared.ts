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
 * Histogram on projected source `bucket` with MAX-per-minute then SUM into the
 * analysis interval, so overlapping MATCH recounts do not double-count and
 * coarser analysis buckets (e.g. 5m) still sum closed-minute volumes.
 */
export function buildChangePointTimeSeriesAggs(
  bucketInterval: string,
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
        fixed_interval: bucketInterval,
        min_doc_count: 0,
        extended_bounds: extendedBounds,
      },
      aggs: {
        by_minute: {
          date_histogram: {
            field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
            fixed_interval: '1m',
            min_doc_count: 0,
          },
          aggs: {
            minute_max: {
              max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
            },
          },
        },
        volume: {
          sum_bucket: {
            buckets_path: 'by_minute>minute_max',
          },
        },
      },
    },
    change_points: { change_point: { buckets_path: 'over_time>volume' } },
  };
}
