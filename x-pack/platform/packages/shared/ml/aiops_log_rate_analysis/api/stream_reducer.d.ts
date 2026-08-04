import type { PayloadAction } from '@reduxjs/toolkit';
import type { SignificantItem, SignificantItemGroup, SignificantItemHistogram, SignificantItemGroupHistogram } from '@kbn/ml-agg-utils';
import type { WindowParameters } from '../window_parameters';
import type { LogRateAnalysisType } from '../log_rate_analysis_type';
export interface StreamState {
    ccsWarning: boolean;
    currentAnalysisType?: LogRateAnalysisType;
    currentAnalysisWindowParameters?: WindowParameters;
    significantItems: SignificantItem[];
    significantItemsGroups: SignificantItemGroup[];
    errors: string[];
    loaded: number;
    loadingState: string;
    remainingKeywordFieldCandidates?: string[];
    remainingTextFieldCandidates?: string[];
    groupsMissing?: boolean;
    zeroDocsFallback: boolean;
}
export declare const getDefaultState: () => StreamState;
export declare const logRateAnalysisResultsSlice: import("@reduxjs/toolkit").Slice<StreamState, {
    addSignificantItems: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItem[]>) => void;
    addSignificantItemsHistogram: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItemHistogram[]>) => void;
    addSignificantItemsGroup: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItemGroup[]>) => void;
    addSignificantItemsGroupHistogram: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItemGroupHistogram[]>) => void;
    addError: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<string>) => void;
    ping: () => void;
    resetErrors: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }) => void;
    resetGroups: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }) => void;
    resetResults: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }) => {
        currentAnalysisType: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        ccsWarning: boolean;
        significantItems: SignificantItem[];
        significantItemsGroups: SignificantItemGroup[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[];
        remainingTextFieldCandidates?: string[];
        groupsMissing?: boolean;
        zeroDocsFallback: boolean;
    };
    updateLoadingState: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<{
        ccsWarning: boolean;
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[];
        remainingTextFieldCandidates?: string[];
        groupsMissing?: boolean;
    }>) => {
        ccsWarning: boolean;
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[];
        remainingTextFieldCandidates?: string[];
        groupsMissing?: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        zeroDocsFallback: boolean;
    };
    setZeroDocsFallback: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<boolean>) => void;
    setCurrentAnalysisType: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<LogRateAnalysisType | undefined>) => void;
    setCurrentAnalysisWindowParameters: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<WindowParameters | undefined>) => void;
}, "logRateAnalysisResults", "logRateAnalysisResults", import("@reduxjs/toolkit").SliceSelectors<StreamState>>;
export declare const streamReducer: import("redux").Reducer<StreamState>;
export declare const streamReducerActions: import("@reduxjs/toolkit").CaseReducerActions<{
    addSignificantItems: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItem[]>) => void;
    addSignificantItemsHistogram: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItemHistogram[]>) => void;
    addSignificantItemsGroup: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItemGroup[]>) => void;
    addSignificantItemsGroupHistogram: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<SignificantItemGroupHistogram[]>) => void;
    addError: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<string>) => void;
    ping: () => void;
    resetErrors: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }) => void;
    resetGroups: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }) => void;
    resetResults: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }) => {
        currentAnalysisType: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        ccsWarning: boolean;
        significantItems: SignificantItem[];
        significantItemsGroups: SignificantItemGroup[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[];
        remainingTextFieldCandidates?: string[];
        groupsMissing?: boolean;
        zeroDocsFallback: boolean;
    };
    updateLoadingState: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<{
        ccsWarning: boolean;
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[];
        remainingTextFieldCandidates?: string[];
        groupsMissing?: boolean;
    }>) => {
        ccsWarning: boolean;
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[];
        remainingTextFieldCandidates?: string[];
        groupsMissing?: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        zeroDocsFallback: boolean;
    };
    setZeroDocsFallback: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<boolean>) => void;
    setCurrentAnalysisType: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<LogRateAnalysisType | undefined>) => void;
    setCurrentAnalysisWindowParameters: (state: {
        ccsWarning: boolean;
        currentAnalysisType?: LogRateAnalysisType | undefined;
        currentAnalysisWindowParameters?: {
            baselineMin: number;
            baselineMax: number;
            deviationMin: number;
            deviationMax: number;
        } | undefined;
        significantItems: {
            key: string;
            type: import("@kbn/ml-agg-utils").SignificantItemType;
            doc_count: number;
            bg_count: number;
            total_doc_count: number;
            total_bg_count: number;
            score: number;
            pValue: number | null;
            normalizedScore: number;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
            unique?: boolean | undefined;
            logRateChangeSort?: number | undefined;
            fieldName: string;
            fieldValue: string | number;
        }[];
        significantItemsGroups: {
            id: string;
            group: {
                key: string;
                type: import("@kbn/ml-agg-utils").SignificantItemType;
                docCount: number;
                pValue: number | null;
                duplicate?: number | undefined;
                fieldName: string;
                fieldValue: string | number;
            }[];
            docCount: number;
            pValue: number | null;
            histogram?: {
                doc_count_significant_item: number;
                doc_count_overall: number;
                key: number;
                key_as_string: string;
            }[] | undefined;
        }[];
        errors: string[];
        loaded: number;
        loadingState: string;
        remainingKeywordFieldCandidates?: string[] | undefined;
        remainingTextFieldCandidates?: string[] | undefined;
        groupsMissing?: boolean | undefined;
        zeroDocsFallback: boolean;
    }, action: PayloadAction<WindowParameters | undefined>) => void;
}, "logRateAnalysisResults">;
type StreamReducerActions = typeof streamReducerActions;
export type ApiActionName = keyof StreamReducerActions;
export type AiopsLogRateAnalysisApiAction = ReturnType<StreamReducerActions[ApiActionName]>;
export declare const addError: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "logRateAnalysisResults/addError">, addSignificantItems: import("@reduxjs/toolkit").ActionCreatorWithPayload<SignificantItem[], "logRateAnalysisResults/addSignificantItems">, addSignificantItemsGroup: import("@reduxjs/toolkit").ActionCreatorWithPayload<SignificantItemGroup[], "logRateAnalysisResults/addSignificantItemsGroup">, addSignificantItemsGroupHistogram: import("@reduxjs/toolkit").ActionCreatorWithPayload<SignificantItemGroupHistogram[], "logRateAnalysisResults/addSignificantItemsGroupHistogram">, addSignificantItemsHistogram: import("@reduxjs/toolkit").ActionCreatorWithPayload<SignificantItemHistogram[], "logRateAnalysisResults/addSignificantItemsHistogram">, ping: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"logRateAnalysisResults/ping">, resetResults: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"logRateAnalysisResults/resetResults">, resetErrors: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"logRateAnalysisResults/resetErrors">, resetGroups: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"logRateAnalysisResults/resetGroups">, setCurrentAnalysisType: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<LogRateAnalysisType | undefined, "logRateAnalysisResults/setCurrentAnalysisType">, setCurrentAnalysisWindowParameters: import("@reduxjs/toolkit").ActionCreatorWithOptionalPayload<WindowParameters | undefined, "logRateAnalysisResults/setCurrentAnalysisWindowParameters">, setZeroDocsFallback: import("@reduxjs/toolkit").ActionCreatorWithPayload<boolean, "logRateAnalysisResults/setZeroDocsFallback">, updateLoadingState: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    ccsWarning: boolean;
    loaded: number;
    loadingState: string;
    remainingKeywordFieldCandidates?: string[];
    remainingTextFieldCandidates?: string[];
    groupsMissing?: boolean;
}, "logRateAnalysisResults/updateLoadingState">;
export {};
