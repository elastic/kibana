/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSamplerAggregation } from './build_sampler_aggregation';

describe('buildSamplerAggregation', () => {
  const testAggs = {
    bytes_stats: {
      stats: { field: 'bytes' },
    },
  };

  test('returns wrapped sampler aggregation for sampler shard size of 1000', () => {
    expect(buildSamplerAggregation(testAggs, 1000)).toEqual({
      sample: {
        sampler: {
          shard_size: 1000,
        },
        aggs: testAggs,
      },
    });
  });

  test('returns un-sampled aggregation as-is for sampler shard size of 0', () => {
    expect(buildSamplerAggregation(testAggs, 0)).toEqual(testAggs);
  });
});
