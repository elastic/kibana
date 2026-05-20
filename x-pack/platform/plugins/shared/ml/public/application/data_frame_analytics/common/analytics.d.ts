import type { BehaviorSubject } from 'rxjs';
import { type ClassificationEvaluateResponse, type DataFrameAnalysisConfigType } from '@kbn/ml-data-frame-analytics-utils';
import type { estypes } from '@elastic/elasticsearch';
import type { Dictionary } from '@kbn/ml-common-types/common';
import type { MlApi } from '../../services/ml_api_service';
export type IndexPattern = string;
export interface LoadExploreDataArg {
    filterByIsTraining?: boolean;
    searchQuery: estypes.QueryDslQueryContainer;
}
export interface ClassificationMetricItem {
    className: string;
    accuracy?: number;
    recall?: number;
}
export declare const SEARCH_SIZE = 1000;
export declare const defaultSearchQuery: {
    match_all: {};
};
export declare const getDefaultTrainingFilterQuery: (resultsField: string, isTraining: boolean) => {
    bool: {
        minimum_should_match: number;
        should: {
            match: {
                [x: string]: boolean;
            };
        }[];
    };
};
export interface SearchQuery {
    track_total_hits?: boolean;
    query: estypes.QueryDslQueryContainer;
    sort?: any;
}
export interface Eval {
    mse: number | string;
    msle: number | string;
    huber: number | string;
    rSquared: number | string;
    error: null | string;
}
export interface RegressionEvaluateResponse {
    regression: {
        huber: {
            value: number;
        };
        mse: {
            value: number;
        };
        msle: {
            value: number;
        };
        r_squared: {
            value: number;
        };
    };
}
interface LoadEvaluateResult {
    success: boolean;
    eval: RegressionEvaluateResponse | ClassificationEvaluateResponse | null;
    error: string | null;
}
export declare const isResultsSearchBoolQuery: (arg: any) => arg is ResultsSearchBoolQuery;
export declare const isQueryStringQuery: (arg: any) => arg is QueryStringQuery;
export declare const isRegressionEvaluateResponse: (arg: any) => arg is RegressionEvaluateResponse;
export declare const isClassificationEvaluateResponse: (arg: any) => arg is ClassificationEvaluateResponse;
export declare enum REFRESH_ANALYTICS_LIST_STATE {
    ERROR = "error",
    IDLE = "idle",
    LOADING = "loading",
    REFRESH = "refresh"
}
export declare const refreshAnalyticsList$: BehaviorSubject<REFRESH_ANALYTICS_LIST_STATE>;
export declare const useRefreshAnalyticsList: (callback?: {
    isLoading?(d: boolean): void;
    onRefresh?(): void;
}) => {
    refresh: () => void;
};
interface RegressionEvaluateExtractedResponse {
    mse: number | string;
    msle: number | string;
    huber: number | string;
    r_squared: number | string;
}
export declare const EMPTY_STAT = "--";
export declare function getValuesFromResponse(response: RegressionEvaluateResponse): RegressionEvaluateExtractedResponse;
interface ResultsSearchBoolQuery {
    bool: Dictionary<any>;
}
interface ResultsSearchTermQuery {
    term: Dictionary<any>;
}
interface QueryStringQuery {
    query_string: Dictionary<any>;
}
export type ResultsSearchQuery = ResultsSearchBoolQuery | ResultsSearchTermQuery | estypes.QueryDslQueryContainer;
export declare function getEvalQueryBody({ resultsField, isTraining, searchQuery, ignoreDefaultQuery, }: {
    resultsField: string;
    isTraining?: boolean;
    searchQuery?: ResultsSearchQuery;
    ignoreDefaultQuery?: boolean;
}): any;
export declare enum REGRESSION_STATS {
    MSE = "mse",
    MSLE = "msle",
    R_SQUARED = "rSquared",
    HUBER = "huber"
}
interface LoadEvalDataConfig {
    mlApi: MlApi;
    isTraining?: boolean;
    index: string;
    dependentVariable: string;
    resultsField: string;
    predictionFieldName?: string;
    searchQuery?: ResultsSearchQuery;
    ignoreDefaultQuery?: boolean;
    jobType: DataFrameAnalysisConfigType;
    requiresKeyword?: boolean;
    rocCurveClassName?: string;
    includeMulticlassConfusionMatrix?: boolean;
}
export declare const loadEvalData: ({ mlApi, isTraining, index, dependentVariable, resultsField, predictionFieldName, searchQuery, ignoreDefaultQuery, jobType, requiresKeyword, rocCurveClassName, includeMulticlassConfusionMatrix, }: LoadEvalDataConfig) => Promise<LoadEvaluateResult>;
interface LoadDocsCountConfig {
    mlApi: MlApi;
    ignoreDefaultQuery?: boolean;
    isTraining?: boolean;
    searchQuery: estypes.QueryDslQueryContainer;
    resultsField: string;
    destIndex: string;
}
interface LoadDocsCountResponse {
    docsCount: number | null;
    success: boolean;
}
export declare const loadDocsCount: ({ mlApi, ignoreDefaultQuery, isTraining, searchQuery, resultsField, destIndex, }: LoadDocsCountConfig) => Promise<LoadDocsCountResponse>;
export {};
