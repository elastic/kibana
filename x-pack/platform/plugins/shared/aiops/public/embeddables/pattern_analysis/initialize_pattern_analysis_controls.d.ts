import type { StateComparators } from '@kbn/presentation-publishing';
import type { PatternAnalysisComponentApi } from './types';
import type { PatternAnalysisEmbeddableState } from '../../../common/embeddables/pattern_analysis/types';
type PatternAnalysisState = Pick<PatternAnalysisEmbeddableState, 'dataViewId' | 'fieldName' | 'minimumTimeRangeOption' | 'randomSamplerMode' | 'randomSamplerProbability'>;
export declare const initializePatternAnalysisControls: (state: PatternAnalysisEmbeddableState) => {
    patternAnalysisControlsApi: PatternAnalysisComponentApi;
    serializePatternAnalysisChartState: () => PatternAnalysisState;
    patternAnalysisControlsComparators: StateComparators<PatternAnalysisState>;
};
export {};
