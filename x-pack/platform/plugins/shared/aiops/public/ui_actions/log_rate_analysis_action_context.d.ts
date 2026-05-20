import { type EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { LogRateAnalysisEmbeddableApi } from '../embeddables/log_rate_analysis/types';
export interface LogRateAnalysisActionContext extends EmbeddableApiContext {
    embeddable: LogRateAnalysisEmbeddableApi;
}
export declare function isLogRateAnalysisEmbeddableContext(arg: unknown): arg is LogRateAnalysisActionContext;
