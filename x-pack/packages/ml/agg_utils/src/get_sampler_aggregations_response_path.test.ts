/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSamplerAggregationsResponsePath } from './get_sampler_aggregations_response_path';

describe('getSamplerAggregationsResponsePath', () => {
  test('returns correct path for sampler shard size of 1000', () => {
    expect(getSamplerAggregationsResponsePath(1000)).toEqual(['sample']);
  });

  test('returns correct path for sampler shard size of 0', () => {
    expect(getSamplerAggregationsResponsePath(0)).toEqual([]);
  });
});
