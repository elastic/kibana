/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildChangePointHistogramBounds,
  buildChangePointTimeSeriesAggs,
  buildDateHistogramAgg,
} from './change_point_scan_shared';

describe('buildChangePointHistogramBounds', () => {
  it('pins the date_histogram to the lookback window and excludes the open bucket', () => {
    expect(buildChangePointHistogramBounds('now-30m', '30s')).toEqual({
      min: 'now-30m',
      max: 'now-30s',
    });
  });
});

describe('buildDateHistogramAgg', () => {
  it('includes extended_bounds so change_point receives enough buckets', () => {
    const extendedBounds = buildChangePointHistogramBounds('now-30m', '30s');

    expect(buildDateHistogramAgg('30s', extendedBounds)).toEqual({
      date_histogram: {
        field: '@timestamp',
        fixed_interval: '30s',
        min_doc_count: 0,
        extended_bounds: extendedBounds,
      },
    });
  });
});

describe('buildChangePointTimeSeriesAggs', () => {
  it('threads extended_bounds through the over_time histogram', () => {
    const extendedBounds = buildChangePointHistogramBounds('now-30m', '30s');
    const aggs = buildChangePointTimeSeriesAggs('30s', {
      useDistinctSignalCount: false,
      extendedBounds,
    });

    expect(aggs.over_time).toEqual(buildDateHistogramAgg('30s', extendedBounds));
    expect(aggs.change_points).toEqual({
      change_point: { buckets_path: 'over_time>_count' },
    });
  });

  it('always runs change_point over raw _count, even when distinct signal counting is enabled', () => {
    const extendedBounds = buildChangePointHistogramBounds('now-30m', '30s');
    const aggs = buildChangePointTimeSeriesAggs('30s', {
      useDistinctSignalCount: true,
      extendedBounds,
    });

    // The pipeline input must be `_count`, not the `signal_count` cardinality: the latter is ~1
    // per bucket under v2 and starves change_point of variance.
    expect(aggs.change_points).toEqual({
      change_point: { buckets_path: 'over_time>_count' },
    });
  });

  it('does not attach a signal_count sub-agg to over_time under v2 (the pipeline reads _count, and the series is dropped from the response)', () => {
    const extendedBounds = buildChangePointHistogramBounds('now-30m', '30s');
    const aggs = buildChangePointTimeSeriesAggs('30s', {
      useDistinctSignalCount: true,
      extendedBounds,
    });

    // over_time is a plain histogram — no wasted per-bucket cardinality.
    expect(aggs.over_time).toEqual(buildDateHistogramAgg('30s', extendedBounds));
    // last_5m still carries the distinct signal_count under v2, since that value IS consumed.
    expect((aggs.last_5m as { aggs?: unknown }).aggs).toEqual({
      signal_count: { cardinality: { field: 'group_hash' } },
    });
  });
});
