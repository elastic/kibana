import type { RandomSamplerOption, RandomSamplerProbability } from '@kbn/ml-random-sampler-utils';
import type { RandomSamplerStorage } from './use_random_sampler_storage';
export declare const RANDOM_SAMPLER_PROBABILITIES: number[];
export declare const MIN_SAMPLER_PROBABILITY = 0.00001;
export declare const RANDOM_SAMPLER_STEP: number;
export declare const DEFAULT_PROBABILITY = 0.001;
export declare const RANDOM_SAMPLER_SELECT_OPTIONS: Array<{
    value: RandomSamplerOption;
    inputDisplay: string;
    'data-test-subj': string;
}>;
export declare class RandomSampler {
    private docCount$;
    private mode$;
    private probability$;
    private setRandomSamplerModeInStorage;
    private setRandomSamplerProbabilityInStorage;
    constructor({ randomSamplerMode, randomSamplerProbability, setRandomSamplerMode, setRandomSamplerProbability, }: RandomSamplerStorage);
    setDocCount(docCount: number): void;
    getDocCount(): number;
    setMode(mode: RandomSamplerOption): void;
    getMode$(): import("rxjs").Observable<RandomSamplerOption>;
    getMode(): RandomSamplerOption;
    setProbability(probability: RandomSamplerProbability): void;
    getProbability$(): import("rxjs").Observable<RandomSamplerProbability>;
    getProbability(): RandomSamplerProbability;
    createRandomSamplerWrapper(): {
        wrap: <T extends Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregationContainer>>(aggs: T) => T | Record<string, import("@elastic/elasticsearch/lib/api/types").AggregationsAggregationContainer>;
        unwrap: <T extends Exclude<import("@elastic/elasticsearch/lib/api/types").SearchResponse["aggregations"], undefined>>(responseAggs: T) => T | T[string];
        probability: number;
    };
}
export declare const randomSamplerText: (randomSamplerPreference: RandomSamplerOption) => {
    calloutInfoMessage: string;
    buttonText: string;
};
