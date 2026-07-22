/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRIC_SERIES_BUCKET_RUNTIME_FIELD,
  METRIC_SERIES_VALUE_RUNTIME_FIELD,
  buildChangePointHistogramBounds,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';

describe('buildChangePointHistogramBounds', () => {
  it('pins the date_histogram to the lookback window and excludes the open bucket', () => {
    expect(buildChangePointHistogramBounds('now-40m', '1m')).toEqual({
      min: 'now-40m',
      max: 'now-1m',
    });
  });
});

describe('buildChangePointTimeSeriesAggs', () => {
  it('aggregates metric_value on source buckets and feeds change_point that volume path', () => {
    const extendedBounds = buildChangePointHistogramBounds('now-40m', '1m');
    const aggs = buildChangePointTimeSeriesAggs('1m', { extendedBounds });

    expect(aggs.over_time).toEqual({
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: '1m',
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
    });
    expect(aggs.change_points).toEqual({
      change_point: { buckets_path: 'over_time>volume' },
    });
    expect(Object.keys(aggs).sort()).toEqual(['change_points', 'over_time']);
  });
});
