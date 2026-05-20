import type { PayloadAction } from '@reduxjs/toolkit';
import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export interface FetchFieldCandidatesParams {
    http: HttpSetup;
    endpoint: string;
    apiVersion?: string;
    abortCtrl: React.MutableRefObject<AbortController>;
    body?: AiopsLogRateAnalysisSchema;
    headers?: HttpFetchOptions['headers'];
}
/**
 * Async thunk to fetch field candidates.
 */
export declare const fetchFieldCandidates: import("@reduxjs/toolkit").AsyncThunk<void, FetchFieldCandidatesParams, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export interface FieldCandidatesState {
    isLoading: boolean;
    fieldSelectionMessage?: string;
    fieldFilterUniqueItems: string[];
    initialFieldFilterSkippedItems: string[];
    currentFieldFilterSkippedItems: string[] | null;
    keywordFieldCandidates: string[];
    textFieldCandidates: string[];
    selectedKeywordFieldCandidates: string[];
    selectedTextFieldCandidates: string[];
}
export declare function getDefaultState(): FieldCandidatesState;
export declare const logRateAnalysisFieldCandidatesSlice: import("@reduxjs/toolkit").Slice<FieldCandidatesState, {
    setAllFieldCandidates: (state: FieldCandidatesState, action: PayloadAction<Omit<FieldCandidatesState, "isLoading">>) => {
        keywordFieldCandidates: string[];
        selectedKeywordFieldCandidates: string[];
        textFieldCandidates: string[];
        selectedTextFieldCandidates: string[];
        fieldSelectionMessage?: string;
        fieldFilterUniqueItems: string[];
        initialFieldFilterSkippedItems: string[];
        currentFieldFilterSkippedItems: string[] | null;
        isLoading: boolean;
    };
    setCurrentFieldFilterSkippedItems: (state: FieldCandidatesState, action: PayloadAction<string[]>) => {
        currentFieldFilterSkippedItems: string[];
        isLoading: boolean;
        fieldSelectionMessage?: string;
        fieldFilterUniqueItems: string[];
        initialFieldFilterSkippedItems: string[];
        keywordFieldCandidates: string[];
        textFieldCandidates: string[];
        selectedKeywordFieldCandidates: string[];
        selectedTextFieldCandidates: string[];
    };
}, "log_rate_analysis_field_candidates">;
export declare const setAllFieldCandidates: import("@reduxjs/toolkit").ActionCreatorWithPayload<Omit<FieldCandidatesState, "isLoading">, "log_rate_analysis_field_candidates/setAllFieldCandidates">, setCurrentFieldFilterSkippedItems: import("@reduxjs/toolkit").ActionCreatorWithPayload<string[], "log_rate_analysis_field_candidates/setCurrentFieldFilterSkippedItems">;
