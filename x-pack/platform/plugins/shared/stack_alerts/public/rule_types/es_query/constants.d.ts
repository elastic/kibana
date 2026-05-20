import { COMPARATORS } from '@kbn/alerting-comparators';
export declare const DEFAULT_VALUES: {
    THRESHOLD_COMPARATOR: COMPARATORS;
    QUERY: string;
    SIZE: number;
    TIME_WINDOW_SIZE: number;
    TIME_WINDOW_UNIT: string;
    THRESHOLD: number[];
    AGGREGATION_TYPE: string;
    TERM_SIZE: number;
    GROUP_BY: string;
    EXCLUDE_PREVIOUS_HITS: boolean;
    CAN_SELECT_MULTI_TERMS: boolean;
};
export declare const SERVERLESS_DEFAULT_VALUES: {
    SIZE: number;
};
export declare const COMMON_EXPRESSION_ERRORS: {
    searchType: string[];
    threshold0: string[];
    threshold1: string[];
    timeWindowSize: string[];
    size: string[];
    aggField: string[];
    aggType: string[];
    groupBy: string[];
    termSize: string[];
    termField: string[];
};
export declare const SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS: {
    searchConfiguration: string[];
    timeField: string[];
};
export declare const ONLY_ES_QUERY_EXPRESSION_ERRORS: {
    index: string[];
    esQuery: string[];
    timeField: string[];
};
export declare const ONLY_ESQL_QUERY_EXPRESSION_ERRORS: {
    esqlQuery: string[];
    timeField: string[];
    thresholdComparator: string[];
    threshold0: string[];
    groupBy: string[];
};
declare const ALL_EXPRESSION_ERROR_ENTRIES: {
    index: string[];
    esQuery: string[];
    timeField: string[];
    searchConfiguration: string[];
    searchType: string[];
    threshold0: string[];
    threshold1: string[];
    timeWindowSize: string[];
    size: string[];
    aggField: string[];
    aggType: string[];
    groupBy: string[];
    termSize: string[];
    termField: string[];
};
export declare const ALL_EXPRESSION_ERROR_KEYS: Array<keyof typeof ALL_EXPRESSION_ERROR_ENTRIES>;
export {};
