/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Wraps the supplied aggregations in a sampler aggregation.
 * A supplied samplerShardSize (the shard_size parameter of the sampler aggregation)
 * of less than 1 indicates no sampling, and the aggs are returned as-is.
 *
 * @param aggs - The aggregations to be wrapped in the sampler aggregation.
 * @param shardSize - The shard size parameter for the sampler aggregation.
 *                    A value less than 1 indicates no sampling.
 * @returns The wrapped aggregations.
 */
export function buildSamplerAggregation(
  aggs: any,
  shardSize: number
): Record<string, estypes.AggregationsAggregationContainer> {
  if (shardSize <= 0) {
    return aggs;
  }

  return {
    sample: {
      sampler: {
        shard_size: shardSize,
      },
      aggs,
    },
  };
}
