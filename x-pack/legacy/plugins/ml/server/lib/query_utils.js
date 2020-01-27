/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Contains utility functions for building and processing queries.
 */

// Builds the base filter criteria used in queries,
// adding criteria for the time range and an optional query.
export function buildBaseFilterCriteria(timeFieldName, earliestMs, latestMs, query) {
  const filterCriteria = [];
  if (timeFieldName && earliestMs && latestMs) {
    filterCriteria.push({
      range: {
        [timeFieldName]: {
          gte: earliestMs,
          lte: latestMs,
          format: 'epoch_millis',
        },
      },
    });
  }

  if (query) {
    filterCriteria.push(query);
  }

  return filterCriteria;
}

// Wraps the supplied aggregations in a sampler aggregation.
// A supplied samplerShardSize (the shard_size parameter of the sampler aggregation)
// of less than 1 indicates no sampling, and the aggs are returned as-is.
export function buildSamplerAggregation(aggs, samplerShardSize) {
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

// Returns the path of aggregations in the elasticsearch response, as an array,
// depending on whether sampling is being used.
// A supplied samplerShardSize (the shard_size parameter of the sampler aggregation)
// of less than 1 indicates no sampling, and an empty array is returned.
export function getSamplerAggregationsResponsePath(samplerShardSize) {
  return samplerShardSize > 0 ? ['sample'] : [];
}
