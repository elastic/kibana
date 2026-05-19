/**
 * Returns the path of aggregations in the Elasticsearch response as an array,
 * depending on whether sampling is being used.
 *
 * @param samplerShardSize - The shard size parameter of the sampler aggregation.
 *                           A value less than 1 indicates no sampling.
 * @returns An array representing the path of aggregations in the response.
 */
export declare function getSamplerAggregationsResponsePath(samplerShardSize: number): string[];
