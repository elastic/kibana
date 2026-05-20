import type { RandomSamplerOption, RandomSamplerProbability } from '@kbn/ml-random-sampler-utils';
import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
export type MinimumTimeRangeOption = 'No minimum' | '1 week' | '1 month' | '3 months' | '6 months';
export interface PatternAnalysisEmbeddableState extends SerializedTitles, SerializedTimeRange {
    dataViewId?: string;
    fieldName?: string;
    minimumTimeRangeOption: MinimumTimeRangeOption;
    randomSamplerMode: RandomSamplerOption;
    randomSamplerProbability: RandomSamplerProbability;
}
export type StoredPatternAnalysisEmbeddableState = Omit<PatternAnalysisEmbeddableState, 'dataViewId'>;
