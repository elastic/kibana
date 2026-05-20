import type { PayloadAction } from '@reduxjs/toolkit';
import type { WindowParameters } from '../window_parameters';
import type { LogRateAnalysisType } from '../log_rate_analysis_type';
import type { DocumentStats } from '../types';
export type InitialAnalysisStart = number | WindowParameters | undefined;
/**
 * Payload for brushSelectionUpdate action
 */
export interface BrushSelectionUpdatePayload {
    /** The window parameters to update the analysis with */
    windowParameters: WindowParameters;
    /** Flag to force the update */
    force: boolean;
    analysisType: LogRateAnalysisType;
}
export interface LogRateAnalysisState {
    analysisType: LogRateAnalysisType;
    autoRunAnalysis: boolean;
    initialAnalysisStart: InitialAnalysisStart;
    isBrushCleared: boolean;
    groupResults: boolean;
    stickyHistogram: boolean;
    chartWindowParameters?: WindowParameters;
    earliest?: number;
    latest?: number;
    intervalMs?: number;
    documentStats: DocumentStats;
}
export declare const logRateAnalysisSlice: import("@reduxjs/toolkit").Slice<LogRateAnalysisState, {
    brushSelectionUpdate: (state: LogRateAnalysisState, action: PayloadAction<BrushSelectionUpdatePayload>) => void;
    clearSelection: (state: LogRateAnalysisState) => void;
    setAnalysisType: (state: LogRateAnalysisState, action: PayloadAction<LogRateAnalysisType>) => void;
    setAutoRunAnalysis: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => void;
    setDocumentCountChartData: (state: LogRateAnalysisState, action: PayloadAction<{
        earliest?: number;
        latest?: number;
        intervalMs?: number;
        documentStats: DocumentStats;
    }>) => void;
    setGroupResults: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => void;
    setInitialAnalysisStart: (state: LogRateAnalysisState, action: PayloadAction<InitialAnalysisStart>) => void;
    setIsBrushCleared: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => void;
    setStickyHistogram: (state: LogRateAnalysisState, action: PayloadAction<boolean>) => void;
    setChartWindowParameters: (state: LogRateAnalysisState, action: PayloadAction<WindowParameters | undefined>) => void;
}, "logRateAnalysis">;
export declare const brushSelectionUpdate: import("@reduxjs/toolkit").ActionCreatorWithPayload<BrushSelectionUpdatePayload, "logRateAnalysis/brushSelectionUpdate">, clearSelection: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"logRateAnalysis/clearSelection">, setAnalysisType: import("@reduxjs/toolkit").ActionCreatorWithPayload<LogRateAnalysisType, "logRateAnalysis/setAnalysisType">, setAutoRunAnalysis: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "logRateAnalysis/setAutoRunAnalysis">, setDocumentCountChartData: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    earliest?: number;
    latest?: number;
    intervalMs?: number;
    documentStats: DocumentStats;
}, "logRateAnalysis/setDocumentCountChartData">, setGroupResults: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "logRateAnalysis/setGroupResults">, setInitialAnalysisStart: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<InitialAnalysisStart, "logRateAnalysis/setInitialAnalysisStart">, setIsBrushCleared: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "logRateAnalysis/setIsBrushCleared">, setStickyHistogram: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "logRateAnalysis/setStickyHistogram">, setChartWindowParameters: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<WindowParameters | undefined, "logRateAnalysis/setChartWindowParameters">;
