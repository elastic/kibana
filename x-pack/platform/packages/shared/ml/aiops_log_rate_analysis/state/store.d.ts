import { type FC, type PropsWithChildren } from 'react';
import type { InitialAnalysisStart } from './log_rate_analysis_slice';
declare const getReduxStore: () => import("@reduxjs/toolkit/dist/configureStore").ToolkitStore<{
    logRateAnalysis: import("./log_rate_analysis_slice").LogRateAnalysisState;
    logRateAnalysisFieldCandidates: import("./log_rate_analysis_field_candidates_slice").FieldCandidatesState;
    logRateAnalysisResults: import("../api/stream_reducer").StreamState;
    stream: import("@kbn/ml-response-stream/client/stream_slice").StreamState;
    logRateAnalysisTable: import("./log_rate_analysis_table_slice").LogRateAnalysisTableState;
}, import("redux").AnyAction, import("@reduxjs/toolkit").MiddlewareArray<[import("@reduxjs/toolkit").ListenerMiddleware<unknown, import("@reduxjs/toolkit").ThunkDispatch<unknown, unknown, import("redux").AnyAction>, unknown>, import("@reduxjs/toolkit").ThunkMiddleware<{
    logRateAnalysis: import("./log_rate_analysis_slice").LogRateAnalysisState;
    logRateAnalysisFieldCandidates: import("./log_rate_analysis_field_candidates_slice").FieldCandidatesState;
    logRateAnalysisResults: import("../api/stream_reducer").StreamState;
    stream: import("@kbn/ml-response-stream/client/stream_slice").StreamState;
    logRateAnalysisTable: import("./log_rate_analysis_table_slice").LogRateAnalysisTableState;
}, import("redux").AnyAction>]>>;
interface LogRateAnalysisReduxProviderProps {
    initialAnalysisStart?: InitialAnalysisStart;
}
export declare const LogRateAnalysisReduxProvider: FC<PropsWithChildren<LogRateAnalysisReduxProviderProps>>;
type AppStore = ReturnType<typeof getReduxStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
export {};
