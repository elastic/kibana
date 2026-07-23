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
  buildChangePointHistogramWindow,
  buildChangePointTimeSeriesAggs,
} from './change_point_scan_shared';

describe('buildChangePointHistogramWindow', () => {
  it('ends at now-MAX_WRITE_DELAY and extends min by the same write delay', () => {
    // 40m analysis duration ending at now-7m → source min now-47m; write-time prune now-47m.
    expect(buildChangePointHistogramWindow('now-40m')).toEqual({
      bounds: { min: 'now-47m', max: 'now-7m' },
      writeTimeLookback: 'now-47m',
    });
    expect(buildChangePointHistogramWindow('now-125m')).toEqual({
      bounds: { min: 'now-132m', max: 'now-7m' },
      writeTimeLookback: 'now-132m',
    });
  });
});

describe('buildChangePointTimeSeriesAggs', () => {
  it('deduplicates at 1m with MAX then SUM into the configured outer interval', () => {
    const { bounds } = buildChangePointHistogramWindow('now-40m');
    const aggs = buildChangePointTimeSeriesAggs({
      bucketInterval: '5m',
      bounds,
    });

    expect(METRIC_SERIES_ANALYSIS_BUCKET_INTERVAL).toBe('1m');
    expect(aggs.over_time).toEqual({
      date_histogram: {
        field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
        fixed_interval: '5m',
        min_doc_count: 0,
        extended_bounds: bounds,
        hard_bounds: bounds,
      },
      aggs: {
        per_minute: {
          date_histogram: {
            field: METRIC_SERIES_BUCKET_RUNTIME_FIELD,
            fixed_interval: '1m',
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
