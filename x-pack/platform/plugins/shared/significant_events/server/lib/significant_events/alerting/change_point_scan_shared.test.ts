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
  it('pins max to now-EVERY so not-yet-written closed minutes are not zero-filled', () => {
    // Rule emission lag is METRIC_SERIES_EVERY (5m); ending at now-1m fabricates a trailing dip.
    expect(buildChangePointHistogramBounds('now-40m')).toEqual({
      min: 'now-40m',
      max: 'now-5m',
    });
    expect(buildChangePointHistogramBounds('now-125m')).toEqual({
      min: 'now-125m',
      max: 'now-5m',
    });
  });
});

describe('buildChangePointTimeSeriesAggs', () => {
  it('always analyzes at 1m with _count-based zero-fill for CHANGE_POINT metric_value ON bucket', () => {
    const extendedBounds = buildChangePointHistogramBounds('now-40m');
    const aggs = buildChangePointTimeSeriesAggs({ extendedBounds });

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
