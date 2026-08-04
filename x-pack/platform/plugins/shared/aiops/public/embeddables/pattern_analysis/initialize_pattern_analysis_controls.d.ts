import type { StateComparators } from '@kbn/presentation-publishing';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { PatternAnalysisComponentApi } from './types';
type PatternAnalysisState = Pick<PatternAnalysisEmbeddableState, 'data_view_id' | 'field_name' | 'minimum_time_range' | 'random_sampler_mode' | 'random_sampler_probability'>;
export declare const initializePatternAnalysisControls: (state: PatternAnalysisEmbeddableState) => {
    patternAnalysisControlsApi: PatternAnalysisComponentApi;
    serializePatternAnalysisChartState: () => PatternAnalysisState;
    patternAnalysisControlsComparators: StateComparators<PatternAnalysisState>;
};
export {};
