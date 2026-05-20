/**
 * List of default probabilities to use for random sampler
 */
export declare const RANDOM_SAMPLER_PROBABILITIES: number[];
/**
 * Default recommended minimum probability for default sampling
 */
export declare const MIN_SAMPLER_PROBABILITY = 0.00001;
/**
 * Default step minimum probability for default sampling
 */
export declare const RANDOM_SAMPLER_STEP: number;
/**
 * Default probability to use
 */
export declare const DEFAULT_PROBABILITY = 0.001;
/**
 * Default options for random sampler
 */
export declare const RANDOM_SAMPLER_OPTION: {
    readonly ON_AUTOMATIC: "on_automatic";
    readonly ON_MANUAL: "on_manual";
    readonly OFF: "off";
};
/**
 * Default option for random sampler type
 */
export type RandomSamplerOption = (typeof RANDOM_SAMPLER_OPTION)[keyof typeof RANDOM_SAMPLER_OPTION];
/**
 * Type for the random sampler probability
 */
export type RandomSamplerProbability = number | null;
/**
 * Class that helps manage random sampling settings
 * Automatically calculates the probability if only total doc count is provided
 * Else, use the probability that was explicitly set
 */
export declare class RandomSampler {
    private docCount$;
    private mode$;
    private probability$;
    private setRandomSamplerModeInStorage?;
    private setRandomSamplerProbabilityInStorage?;
    /**
     * Initial values
     * @param {RandomSamplerOption} randomSamplerMode - random sampler mode
     * @param setRandomSamplerMode - callback to be called when random sampler mode is set
     * @param randomSamplerProbability - initial value for random sampler probability
     * @param setRandomSamplerProbability - initial setter for random sampler probability
     */
    constructor(randomSamplerMode?: RandomSamplerOption, setRandomSamplerMode?: (mode: RandomSamplerOption) => void, randomSamplerProbability?: RandomSamplerProbability, setRandomSamplerProbability?: (prob: RandomSamplerProbability) => void);
    /**
     * Set total doc count
     * If probability is not explicitly set, this doc count is used for calculating the suggested probability for sampling
     * @param docCount - total document count
     */
    setDocCount(docCount: number): void;
    /**
     * Get doc count
     */
    getDocCount(): number;
    /**
     * Set and save in storage what mode of random sampling to use
     * @param {RandomSamplerOption} mode - mode to use when wrapping/unwrapping random sampling aggs
     */
    setMode(mode: RandomSamplerOption): void;
    /**
     * Observable to get currently set mode of random sampling
     */
    getMode$(): import("rxjs").Observable<RandomSamplerOption>;
    /**
     * Helper to get currently set mode of random sampling
     */
    getMode(): RandomSamplerOption;
    /**
     * Helper to set the probability to use for random sampling requests
     * @param {RandomSamplerProbability} probability - numeric value 0 < probability < 1 to use for random sampling
     */
    setProbability(probability: RandomSamplerProbability): void;
    /**
     * Observability to get the probability to use for random sampling requests
     */
    getProbability$(): import("rxjs").Observable<RandomSamplerProbability>;
    /**
     * Observability to get the probability to use for random sampling requests
     */
    getProbability(): RandomSamplerProbability;
    /**
     * Helper to return factory to extend any ES aggregations with the random sampling probability
     * Returns wrapper = {wrap, unwrap}
     * Where {wrap} extends the ES aggregations with the random sampling probability
     * And {unwrap} accesses the original ES aggregations directly
     */
    createRandomSamplerWrapper(): {
        wrap: <T extends Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregationContainer>>(aggs: T) => T | Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregationContainer>;
        unwrap: <T extends Exclude<import("@elastic/elasticsearch/lib/api/types").SearchResponse["aggregations"], undefined>>(responseAggs: T) => T | T[string];
        probability: number;
    };
}
