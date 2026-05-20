import type { estypes } from '@elastic/elasticsearch';
interface RandomSamplerOptionsBase {
    aggName?: string;
    seed?: number;
}
interface RandomSamplerOptionProbability extends RandomSamplerOptionsBase {
    probability: number;
}
interface RandomSamplerOptionTotalNumDocs extends RandomSamplerOptionsBase {
    totalNumDocs: number;
}
type RandomSamplerOptions = RandomSamplerOptionProbability | RandomSamplerOptionTotalNumDocs;
/**
 * Check if a given probability is suitable for the `random_sampler` aggregation.
 * @param {unknown} p The probability to be tested.
 * @returns {boolean}
 */
export declare function isValidProbability(p: unknown): p is number;
/**
 * The return type of the `createRandomSamplerWrapper` factory.
 */
export type RandomSamplerWrapper = ReturnType<typeof createRandomSamplerWrapper>;
/**
 * Factory to create the random sampler wrapper utility.
 * @param {RandomSamplerOptions} options RandomSamplerOptions
 * @returns {RandomSamplerWrapper} random sampler wrapper utility
 */
export declare const createRandomSamplerWrapper: (options: RandomSamplerOptions) => {
    wrap: <T extends Record<string, estypes.AggregationsAggregationContainer>>(aggs: T) => T | Record<string, estypes.AggregationsAggregationContainer>;
    unwrap: <T extends Exclude<estypes.SearchResponse["aggregations"], undefined>>(responseAggs: T) => T | T[string];
    probability: number;
};
export {};
