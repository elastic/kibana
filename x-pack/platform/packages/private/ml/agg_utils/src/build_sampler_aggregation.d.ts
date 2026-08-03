import type { estypes } from '@elastic/elasticsearch';
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
export declare function buildSamplerAggregation(aggs: any, shardSize: number): Record<string, estypes.AggregationsAggregationContainer>;
