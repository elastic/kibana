/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { RANDOM_SAMPLER_SEED } from './constants';

/**
 * Wraps the supplied aggregations in a random sampler aggregation.
 * A supplied sample probability of 1 indicates no sampling, and the aggs are returned as-is.
 */
export function buildRandomSamplerAggregation(
  aggs: any,
  sampleProbability: number
): Record<string, estypes.AggregationsAggregationContainer> {
  if (sampleProbability === 1) {
    return aggs;
  }

  return {
    sample: {
      // @ts-expect-error `random_sampler` is not yet part of `AggregationsAggregationContainer`
      random_sampler: {
        probability: sampleProbability,
        seed: RANDOM_SAMPLER_SEED,
      },
      aggs,
    },
  };
}
