/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

/**
 * Wraps the supplied aggregations in a sampler aggregation.
 * A supplied samplerShardSize (the shard_size parameter of the sampler aggregation)
 * of less than 1 indicates no sampling, and the aggs are returned as-is.
 */
export function buildSamplerAggregation(
  aggs: any,
  samplerShardSize: number
): Record<string, estypes.AggregationsAggregationContainer> {
  if (samplerShardSize < 1) {
    return aggs;
  }

  return {
    sample: {
      sampler: {
        shard_size: samplerShardSize,
      },
      aggs,
    },
  };
}
