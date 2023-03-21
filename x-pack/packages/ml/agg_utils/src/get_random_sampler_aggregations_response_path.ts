/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Returns the path of aggregations in the elasticsearch response, as an array,
// depending on whether random sampling is being used.
// A supplied randomSamplerProbability
// (the probability parameter of the random sampler aggregation)
// of 1 indicates no random sampling, and an empty array is returned.
export function getRandomSamplerAggregationsResponsePath(
  randomSamplerProbability: number
): string[] {
  return randomSamplerProbability < 1 ? ['sample'] : [];
}
