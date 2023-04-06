/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomSampler } from './random_sampler';

describe('randomSampler', () => {
  const testAggs = {
    bytes_stats: {
      stats: { field: 'bytes' },
    },
  };

  test('returns wrapped random sampler aggregation for probability of 0.01', () => {
    expect(randomSampler({ probability: 0.01 }).wrap(testAggs)).toEqual({
      sample: {
        random_sampler: {
          probability: 0.01,
          seed: 3867412,
        },
        aggs: testAggs,
      },
    });
  });

  test('returns un-sampled aggregation as-is for probability of null', () => {
    expect(randomSampler({ probability: null }).wrap(testAggs)).toEqual(testAggs);
  });
});
