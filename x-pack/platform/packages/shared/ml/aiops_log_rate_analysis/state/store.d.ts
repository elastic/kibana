import { type FC, type PropsWithChildren } from 'react';
import type { InitialAnalysisStart } from './log_rate_analysis_slice';
declare const getReduxStore: () => import("@reduxjs/toolkit").EnhancedStore<{
    logRateAnalysis: import("./log_rate_analysis_slice").LogRateAnalysisState;
    logRateAnalysisFieldCandidates: import("./log_rate_analysis_field_candidates_slice").FieldCandidatesState;
    logRateAnalysisResults: import("../api/stream_reducer").StreamState;
    stream: import("@kbn/ml-response-stream/client/stream_slice").StreamState;
    logRateAnalysisTable: import("./log_rate_analysis_table_slice").LogRateAnalysisTableState;
}, import("redux").UnknownAction, import("@reduxjs/toolkit").Tuple<[import("redux").StoreEnhancer<{
    dispatch: ((action: import("redux").Action<"listenerMiddleware/add">) => import("@reduxjs/toolkit").UnsubscribeListener) & import("@reduxjs/toolkit").ThunkDispatch<{
        logRateAnalysis: import("./log_rate_analysis_slice").LogRateAnalysisState;
        logRateAnalysisFieldCandidates: import("./log_rate_analysis_field_candidates_slice").FieldCandidatesState;
        logRateAnalysisResults: import("../api/stream_reducer").StreamState;
        stream: import("@kbn/ml-response-stream/client/stream_slice").StreamState;
        logRateAnalysisTable: import("./log_rate_analysis_table_slice").LogRateAnalysisTableState;
    }, undefined, import("redux").UnknownAction>;
}>, import("redux").StoreEnhancer]>>;
interface LogRateAnalysisReduxProviderProps {
    initialAnalysisStart?: InitialAnalysisStart;
}
export declare const LogRateAnalysisReduxProvider: FC<PropsWithChildren<LogRateAnalysisReduxProviderProps>>;
type AppStore = ReturnType<typeof getReduxStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export {};
