export declare const EMBEDDABLE_PATTERN_ANALYSIS_TYPE: "aiops_pattern_analysis";
export declare const PATTERN_ANALYSIS_DATA_VIEW_REF_NAME = "aiopsPatternAnalysisEmbeddableDataViewId";
export declare const MINIMUM_TIME_RANGE_OPTION: {
    readonly NO_MINIMUM: "no_minimum";
    readonly ONE_WEEK: "1_week";
    readonly ONE_MONTH: "1_month";
    readonly THREE_MONTHS: "3_months";
    readonly SIX_MONTHS: "6_months";
};
export type MinimumTimeRangeStoredOption = (typeof MINIMUM_TIME_RANGE_OPTION)[keyof typeof MINIMUM_TIME_RANGE_OPTION];
export declare const DEFAULT_MINIMUM_TIME_RANGE: "no_minimum";
