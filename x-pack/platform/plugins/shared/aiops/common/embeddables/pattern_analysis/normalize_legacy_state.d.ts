import { type MinimumTimeRangeStoredOption } from '@kbn/aiops-log-pattern-analysis/constants';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { MinimumTimeRangeOption } from './types';
export declare const toStoredMinimumTimeRange: (minimumTimeRange: string) => MinimumTimeRangeStoredOption;
export declare const toUiMinimumTimeRange: (minimumTimeRange: MinimumTimeRangeStoredOption) => MinimumTimeRangeOption;
export interface LegacyPatternAnalysisFields {
    dataViewId?: string;
    fieldName?: string;
    minimumTimeRangeOption?: string;
    randomSamplerMode?: PatternAnalysisEmbeddableState['random_sampler_mode'];
    randomSamplerProbability?: PatternAnalysisEmbeddableState['random_sampler_probability'];
}
export type RawPatternAnalysisState = Partial<PatternAnalysisEmbeddableState> & LegacyPatternAnalysisFields;
interface NormalizedPatternAnalysisFields {
    data_view_id: string | undefined;
    field_name: string | undefined;
    minimum_time_range: PatternAnalysisEmbeddableState['minimum_time_range'];
    random_sampler_mode: PatternAnalysisEmbeddableState['random_sampler_mode'];
    random_sampler_probability: PatternAnalysisEmbeddableState['random_sampler_probability'];
}
export declare const normalizePatternAnalysisLegacyFields: (state: RawPatternAnalysisState) => NormalizedPatternAnalysisFields;
export {};
