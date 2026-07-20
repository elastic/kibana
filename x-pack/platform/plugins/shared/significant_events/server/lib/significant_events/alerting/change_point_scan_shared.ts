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

export const RULES_BUCKET_SIZE = 1000;

export function buildChangePointHistogramBounds(
  lookback: string,
  bucketInterval: string
): AggregationsExtendedBounds<AggregationsFieldDateMath> {
  return { min: lookback, max: `now-${bucketInterval}` };
}

export function buildDateHistogramAgg(
  bucketInterval: string,
  extendedBounds: AggregationsExtendedBounds<AggregationsFieldDateMath>
) {
  return {
    date_histogram: {
      field: '@timestamp',
      fixed_interval: bucketInterval,
      min_doc_count: 0,
      extended_bounds: extendedBounds,
    },
  };
}

export function buildChangePointTimeSeriesAggs(
  bucketInterval: string,
  {
    extendedBounds,
  }: {
    extendedBounds: AggregationsExtendedBounds<AggregationsFieldDateMath>;
  }
): Record<string, AggregationsAggregationContainer> {
  // change_point reads the raw `_count` of the zero-filled histogram — not a `signal_count`
  // cardinality, which is ~1 per bucket under v2 for ungrouped rules and starves change_point of
  // variance.
  return {
    over_time: buildDateHistogramAgg(bucketInterval, extendedBounds),
    change_points: { change_point: { buckets_path: 'over_time>_count' } },
  };
}
