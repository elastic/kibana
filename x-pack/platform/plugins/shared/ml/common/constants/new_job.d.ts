export declare enum JOB_TYPE {
    SINGLE_METRIC = "single_metric",
    MULTI_METRIC = "multi_metric",
    POPULATION = "population",
    ADVANCED = "advanced",
    CATEGORIZATION = "categorization",
    RARE = "rare",
    GEO = "geo"
}
export declare enum CREATED_BY_LABEL {
    SINGLE_METRIC = "single-metric-wizard",
    MULTI_METRIC = "multi-metric-wizard",
    POPULATION = "population-wizard",
    ADVANCED = "advanced-wizard",
    CATEGORIZATION = "categorization-wizard",
    RARE = "rare-wizard",
    GEO = "geo-wizard",
    GEO_FROM_LENS = "geo-wizard-from-lens",
    APM_TRANSACTION = "ml-module-apm-transaction",
    SINGLE_METRIC_FROM_LENS = "single-metric-wizard-from-lens",
    MULTI_METRIC_FROM_LENS = "multi-metric-wizard-from-lens",
    CATEGORIZATION_FROM_PATTERN_ANALYSIS = "categorization-wizard-from-pattern-analysis"
}
export declare const DEFAULT_MODEL_MEMORY_LIMIT = "10MB";
export declare const DEFAULT_BUCKET_SPAN = "15m";
export declare const DEFAULT_RARE_BUCKET_SPAN = "1h";
export declare const DEFAULT_QUERY_DELAY = "60s";
export declare const SHARED_RESULTS_INDEX_NAME = "shared";
export declare const NUMBER_OF_CATEGORY_EXAMPLES = 5;
