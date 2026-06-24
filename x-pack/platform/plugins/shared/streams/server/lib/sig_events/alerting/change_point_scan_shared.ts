/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';

export const RULES_BUCKET_SIZE = 1000;
export const RECENT_ACTIVITY_MINUTES = 5;
export const LOOKBACK_MINUTES_FLOOR = 20;

const SIGNAL_COUNT_CARDINALITY = {
  signal_count: { cardinality: { field: 'group_hash' } },
} as const;

export function recentActivityTimestampFilter() {
  return { range: { '@timestamp': { gte: `now-${RECENT_ACTIVITY_MINUTES}m` } } };
}

export function floorWindowTimestampFilter() {
  return { range: { '@timestamp': { gte: `now-${LOOKBACK_MINUTES_FLOOR}m` } } };
}

export interface ChangePointHistogramBounds {
  min: string;
  max: string;
}

export function buildChangePointHistogramBounds(
  lookback: string,
  bucketInterval: string
): ChangePointHistogramBounds {
  return { min: lookback, max: `now-${bucketInterval}` };
}

export function buildDateHistogramAgg(
  bucketInterval: string,
  extendedBounds: ChangePointHistogramBounds
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
    useDistinctSignalCount,
    includeFloorWindow = false,
    extendedBounds,
  }: {
    useDistinctSignalCount: boolean;
    includeFloorWindow?: boolean;
    extendedBounds: ChangePointHistogramBounds;
  }
): Record<string, AggregationsAggregationContainer> {
  const countPath = useDistinctSignalCount ? 'signal_count' : '_count';
  const overTime: AggregationsAggregationContainer = useDistinctSignalCount
    ? { ...buildDateHistogramAgg(bucketInterval, extendedBounds), aggs: SIGNAL_COUNT_CARDINALITY }
    : buildDateHistogramAgg(bucketInterval, extendedBounds);
  const last5m: AggregationsAggregationContainer = useDistinctSignalCount
    ? { filter: recentActivityTimestampFilter(), aggs: SIGNAL_COUNT_CARDINALITY }
    : { filter: recentActivityTimestampFilter() };

  const aggs: Record<string, AggregationsAggregationContainer> = {
    over_time: overTime,
    last_5m: last5m,
    change_points: { change_point: { buckets_path: `over_time>${countPath}` } },
  };

  if (includeFloorWindow) {
    aggs.last_floor_window = useDistinctSignalCount
      ? { filter: floorWindowTimestampFilter(), aggs: SIGNAL_COUNT_CARDINALITY }
      : { filter: floorWindowTimestampFilter() };
  }

  return aggs;
}
