import { type FrozenTierPreference } from '@kbn/ml-date-picker';
import type { RandomSamplerOption, RandomSamplerProbability } from '@kbn/ml-random-sampler-utils';
import type { MinimumTimeRangeOption } from '../../common/embeddables/pattern_analysis/types';
export declare const AIOPS_FROZEN_TIER_PREFERENCE = "aiops.frozenDataTierPreference";
export declare const AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE = "aiops.randomSamplingModePreference";
export declare const AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE = "aiops.randomSamplingProbabilityPreference";
export declare const AIOPS_PATTERN_ANALYSIS_MINIMUM_TIME_RANGE_PREFERENCE = "aiops.patternAnalysisMinimumTimeRangePreference";
export type AiOps = Partial<{
    [AIOPS_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
    [AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE]: RandomSamplerOption;
    [AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE]: number;
    [AIOPS_PATTERN_ANALYSIS_MINIMUM_TIME_RANGE_PREFERENCE]: MinimumTimeRangeOption;
}> | null;
export type AiOpsKey = keyof Exclude<AiOps, null>;
export type AiOpsStorageMapped<T extends AiOpsKey> = T extends typeof AIOPS_FROZEN_TIER_PREFERENCE ? FrozenTierPreference | undefined : T extends typeof AIOPS_RANDOM_SAMPLING_MODE_PREFERENCE ? RandomSamplerOption : T extends typeof AIOPS_RANDOM_SAMPLING_PROBABILITY_PREFERENCE ? RandomSamplerProbability : T extends typeof AIOPS_PATTERN_ANALYSIS_MINIMUM_TIME_RANGE_PREFERENCE ? MinimumTimeRangeOption : null;
export declare const AIOPS_STORAGE_KEYS: readonly ["aiops.frozenDataTierPreference", "aiops.randomSamplingModePreference", "aiops.randomSamplingProbabilityPreference", "aiops.patternAnalysisMinimumTimeRangePreference"];
