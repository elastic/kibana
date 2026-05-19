import { type FrozenTierPreference } from '@kbn/ml-date-picker';
import { type RandomSamplerOption } from '../constants/random_sampler';
import type { ESQLDefaultLimitSizeOption } from '../embeddables/grid_embeddable/types';
import type { DATA_DRIFT_COMPARISON_CHART_TYPE } from './data_drift';
export declare const DV_FROZEN_TIER_PREFERENCE = "dataVisualizer.frozenDataTierPreference";
export declare const DV_RANDOM_SAMPLER_PREFERENCE = "dataVisualizer.randomSamplerPreference";
export declare const DV_RANDOM_SAMPLER_P_VALUE = "dataVisualizer.randomSamplerPValue";
export declare const DV_DATA_DRIFT_DISTRIBUTION_CHART_TYPE = "dataVisualizer.dataDriftChartType";
export declare const DV_ESQL_LIMIT_SIZE = "dataVisualizer.esql.limitSize";
export type DV = Partial<{
    [DV_FROZEN_TIER_PREFERENCE]: FrozenTierPreference;
    [DV_RANDOM_SAMPLER_PREFERENCE]: RandomSamplerOption;
    [DV_RANDOM_SAMPLER_P_VALUE]: null | number;
    [DV_DATA_DRIFT_DISTRIBUTION_CHART_TYPE]: DATA_DRIFT_COMPARISON_CHART_TYPE;
    [DV_ESQL_LIMIT_SIZE]: ESQLDefaultLimitSizeOption;
}> | null;
export type DVKey = keyof Exclude<DV, null>;
export type DVStorageMapped<T extends DVKey> = T extends typeof DV_FROZEN_TIER_PREFERENCE ? FrozenTierPreference | undefined : T extends typeof DV_RANDOM_SAMPLER_PREFERENCE ? RandomSamplerOption | undefined : T extends typeof DV_RANDOM_SAMPLER_P_VALUE ? number | null : T extends typeof DV_DATA_DRIFT_DISTRIBUTION_CHART_TYPE ? DATA_DRIFT_COMPARISON_CHART_TYPE : T extends typeof DV_ESQL_LIMIT_SIZE ? ESQLDefaultLimitSizeOption : null;
export declare const DV_STORAGE_KEYS: readonly ["dataVisualizer.frozenDataTierPreference", "dataVisualizer.randomSamplerPreference", "dataVisualizer.randomSamplerPValue", "dataVisualizer.dataDriftChartType"];
