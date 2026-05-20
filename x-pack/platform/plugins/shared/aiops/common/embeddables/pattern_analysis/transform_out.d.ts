import type { Reference } from '@kbn/content-management-utils';
import type { PatternAnalysisEmbeddableState, StoredPatternAnalysisEmbeddableState } from './types';
export declare function transformOut(storedState: StoredPatternAnalysisEmbeddableState, references?: Reference[]): PatternAnalysisEmbeddableState;
