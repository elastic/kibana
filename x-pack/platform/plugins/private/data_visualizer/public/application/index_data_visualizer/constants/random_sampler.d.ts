export declare const RANDOM_SAMPLER_PROBABILITIES: number[];
export declare const MIN_SAMPLER_PROBABILITY = 0.00001;
export declare const RANDOM_SAMPLER_STEP: number;
export declare const RANDOM_SAMPLER_OPTION: {
    readonly ON_AUTOMATIC: "on_automatic";
    readonly ON_MANUAL: "on_manual";
    readonly OFF: "off";
};
export type RandomSamplerOption = (typeof RANDOM_SAMPLER_OPTION)[keyof typeof RANDOM_SAMPLER_OPTION];
export declare const RANDOM_SAMPLER_SELECT_OPTIONS: Array<{
    value: RandomSamplerOption;
    text: string;
    'data-test-subj': string;
}>;
