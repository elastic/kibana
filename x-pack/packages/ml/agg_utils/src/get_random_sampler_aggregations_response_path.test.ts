/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRandomSamplerAggregationsResponsePath } from './get_random_sampler_aggregations_response_path';

describe('getRandomSamplerAggregationsResponsePath', () => {
  test('returns correct path for random sampler probability of 0.01', () => {
    expect(getRandomSamplerAggregationsResponsePath(0.01)).toEqual(['sample']);
  });

  test('returns correct path for random sampler probability of 1', () => {
    expect(getRandomSamplerAggregationsResponsePath(1)).toEqual([]);
  });
});
