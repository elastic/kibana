/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL,
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
  it('always analyzes at 1m with _count-based zero-fill for CHANGE_POINT metric_value ON bucket', () => {
    const extendedBounds = buildChangePointHistogramBounds('now-40m', '1m');
    // Coarser request intervals must not change analysis resolution.
    const aggs = buildChangePointTimeSeriesAggs('5m', { extendedBounds });

    expect(METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL).toBe('1m');
    expect(aggs.over_time).toEqual({
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: '1m',
        min_doc_count: 0,
        extended_bounds: extendedBounds,
      },
      aggs: {
        metric_value_raw: {
          max: { field: METRIC_SERIES_VALUE_RUNTIME_FIELD },
        },
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
    });
    expect(aggs.change_points).toEqual({
      change_point: {
        buckets_path: 'over_time>metric_value',
      },
    });
  });
});
