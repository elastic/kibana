import type { LogRateAnalysisComponentApi } from './types';
import type { LogRateAnalysisEmbeddableState } from '../../../common/embeddables/log_rate_analysis/types';
export declare const initializeLogRateAnalysisControls: (initialState: LogRateAnalysisEmbeddableState) => {
    logRateAnalysisControlsApi: LogRateAnalysisComponentApi;
    serializeLogRateAnalysisChartState: () => Pick<LogRateAnalysisEmbeddableState, "dataViewId">;
};
