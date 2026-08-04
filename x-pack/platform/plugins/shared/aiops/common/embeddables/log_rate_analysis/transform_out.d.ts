import type { Reference } from '@kbn/content-management-utils';
import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
import type { StoredLogRateAnalysisEmbeddableState } from './types';
export declare function transformOut(storedState: StoredLogRateAnalysisEmbeddableState, references?: Reference[]): LogRateAnalysisEmbeddableState;
