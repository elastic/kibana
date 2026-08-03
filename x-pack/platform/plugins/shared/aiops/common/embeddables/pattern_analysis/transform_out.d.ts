import type { Reference } from '@kbn/content-management-utils';
import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';
import type { StoredPatternAnalysisEmbeddableState } from './types';
export declare function transformOut(storedState: StoredPatternAnalysisEmbeddableState, references?: Reference[]): PatternAnalysisEmbeddableState;
