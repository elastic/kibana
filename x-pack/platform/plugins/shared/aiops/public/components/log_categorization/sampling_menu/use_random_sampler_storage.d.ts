export type RandomSamplerStorage = ReturnType<typeof useRandomSamplerStorage>;
export declare function useRandomSamplerStorage(): {
    randomSamplerMode: import("@kbn/ml-random-sampler-utils").RandomSamplerOption;
    setRandomSamplerMode: (value: import("@kbn/ml-random-sampler-utils").RandomSamplerOption) => void;
    randomSamplerProbability: import("@kbn/ml-random-sampler-utils").RandomSamplerProbability;
    setRandomSamplerProbability: (value: import("@kbn/ml-random-sampler-utils").RandomSamplerProbability) => void;
};
