import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
export type MinimumTimeRangeOption = 'No minimum' | '1 week' | '1 month' | '3 months' | '6 months';
export type StoredPatternAnalysisEmbeddableState = Omit<PatternAnalysisEmbeddableState, 'data_view_id'>;
