import type { Reference } from '@kbn/content-management-utils';
import type { LogRateAnalysisEmbeddableState, StoredLogRateAnalysisEmbeddableState } from './types';
export declare function transformOut(storedState: StoredLogRateAnalysisEmbeddableState, references?: Reference[]): LogRateAnalysisEmbeddableState;
