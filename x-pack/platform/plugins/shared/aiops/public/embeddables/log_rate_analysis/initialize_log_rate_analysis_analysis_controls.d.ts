import type { LogRateAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/log_rate_analysis';
import type { LogRateAnalysisComponentApi } from './types';
export declare const initializeLogRateAnalysisControls: (initialState: LogRateAnalysisEmbeddableState) => {
    logRateAnalysisControlsApi: LogRateAnalysisComponentApi;
    serializeLogRateAnalysisChartState: () => Pick<LogRateAnalysisEmbeddableState, "data_view_id">;
};
