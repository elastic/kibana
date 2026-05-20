import type { PayloadAction } from '@reduxjs/toolkit';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { GroupTableItem } from './types';
export declare const AIOPS_LOG_RATE_ANALYSIS_RESULT_COLUMNS = "aiops.logRateAnalysisResultColumns";
export declare const commonColumns: {
    "Log rate": string;
    "Doc count": string;
    "p-value": string;
    Impact: string;
    "Baseline rate": string;
    "Deviation rate": string;
    "Log rate change": string;
    Actions: string;
};
export declare const significantItemColumns: {
    readonly "Log rate": string;
    readonly "Doc count": string;
    readonly "p-value": string;
    readonly Impact: string;
    readonly "Baseline rate": string;
    readonly "Deviation rate": string;
    readonly "Log rate change": string;
    readonly Actions: string;
    readonly "Field name": string;
    readonly "Field value": string;
};
export type LogRateAnalysisResultsTableColumnName = keyof typeof significantItemColumns | 'unique';
type SignificantItemOrNull = SignificantItem | null;
type GroupOrNull = GroupTableItem | null;
export interface LogRateAnalysisTableState {
    skippedColumns: LogRateAnalysisResultsTableColumnName[];
    pinnedGroup: GroupOrNull;
    pinnedSignificantItem: SignificantItemOrNull;
    selectedGroup: GroupOrNull;
    selectedSignificantItem: SignificantItemOrNull;
}
export declare function getPreloadedState(): LogRateAnalysisTableState;
export declare const logRateAnalysisTableSlice: import("@reduxjs/toolkit").Slice<LogRateAnalysisTableState, {
    clearAllRowState: (state: LogRateAnalysisTableState) => void;
    setPinnedGroup: (state: LogRateAnalysisTableState, action: PayloadAction<GroupOrNull>) => void;
    setPinnedSignificantItem: (state: LogRateAnalysisTableState, action: PayloadAction<SignificantItemOrNull>) => void;
    setSelectedGroup: (state: LogRateAnalysisTableState, action: PayloadAction<GroupOrNull>) => void;
    setSelectedSignificantItem: (state: LogRateAnalysisTableState, action: PayloadAction<SignificantItemOrNull>) => void;
    setSkippedColumns: (state: LogRateAnalysisTableState, action: PayloadAction<LogRateAnalysisResultsTableColumnName[]>) => void;
}, "logRateAnalysisTable">;
export declare const clearAllRowState: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"logRateAnalysisTable/clearAllRowState">, setPinnedGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<GroupOrNull, "logRateAnalysisTable/setPinnedGroup">, setPinnedSignificantItem: import("@reduxjs/toolkit").ActionCreatorWithPayload<SignificantItemOrNull, "logRateAnalysisTable/setPinnedSignificantItem">, setSelectedGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<GroupOrNull, "logRateAnalysisTable/setSelectedGroup">, setSelectedSignificantItem: import("@reduxjs/toolkit").ActionCreatorWithPayload<SignificantItemOrNull, "logRateAnalysisTable/setSelectedSignificantItem">, setSkippedColumns: import("@reduxjs/toolkit").ActionCreatorWithPayload<LogRateAnalysisResultsTableColumnName[], "logRateAnalysisTable/setSkippedColumns">;
export declare const localStorageListenerMiddleware: import("@reduxjs/toolkit").ListenerMiddlewareInstance<unknown, import("@reduxjs/toolkit").ThunkDispatch<unknown, unknown, import("redux").AnyAction>, unknown>;
export {};
