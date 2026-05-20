/** Log rate analysis settings */
export declare const LOG_RATE_ANALYSIS_SETTINGS: {
    /**
     * The p-value threshold to be used for statistically significant items.
     */
    readonly P_VALUE_THRESHOLD: 0.02;
    /**
     * The minimum support value to be used for the frequent item sets aggration.
     */
    readonly FREQUENT_ITEMS_SETS_MINIMUM_SUPPORT: 0.001;
    /**
     * The maximum values per field to be used for the frequent item sets aggration.
     */
    readonly FREQUENT_ITEMS_SETS_FIELD_VALUE_LIMIT: 50;
    /**
     * The number of terms by field to fetch for the zero docs fallback analysis.
     */
    readonly TOP_TERMS_FALLBACK_SIZE: 100;
};
/**
 * For the technical preview of Log Rate Analysis we use a hard coded seed.
 * In future versions we might use a user specific seed or let the user customise it.
 */
export declare const RANDOM_SAMPLER_SEED = 3867412;
/** Highlighting color for charts */
export declare const useLogRateAnalysisBarColors: () => {
    barColor: string;
    barHighlightColor: string;
};
export declare const EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE: "aiops_log_rate_analysis";
/**  */
export declare const LOG_RATE_ANALYSIS_DATA_VIEW_REF_NAME = "aiopsLogRateAnalysisEmbeddableDataViewId";
