/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns the path of aggregations in the Elasticsearch response as an array,
 * depending on whether sampling is being used.
 *
 * @param samplerShardSize - The shard size parameter of the sampler aggregation.
 *                           A value less than 1 indicates no sampling.
 * @returns An array representing the path of aggregations in the response.
 */
export function getSamplerAggregationsResponsePath(samplerShardSize: number): string[] {
  return samplerShardSize > 0 ? ['sample'] : [];
}
