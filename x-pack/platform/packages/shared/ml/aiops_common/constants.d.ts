/**
 * AIOPS_PLUGIN_ID is used as a unique identifier for the aiops plugin
 */
export declare const AIOPS_PLUGIN_ID = "aiops";
export declare const AIOPS_API_ENDPOINT: {
    readonly LOG_RATE_ANALYSIS_FIELD_CANDIDATES: "/internal/aiops/log_rate_analysis/field_candidates";
    readonly LOG_RATE_ANALYSIS: "/internal/aiops/log_rate_analysis";
    readonly CATEGORIZATION_FIELD_VALIDATION: "/internal/aiops/categorization_field_validation";
};
/**
 * Used for telemetry purposes to track the origin of the analysis run.
 */
export declare const AIOPS_ANALYSIS_RUN_ORIGIN = "aiops-analysis-run-origin";
export declare const AIOPS_EMBEDDABLE_ORIGIN: {
    readonly CASES: "cases";
    readonly DASHBOARD: "dashboard";
    readonly DEFAULT: "embeddable";
    readonly DISCOVER: "discover";
    readonly ML_AIOPS_LABS: "ml_aiops_labs";
};
export declare const AIOPS_EMBEDDABLE_GROUPING: {
    id: string;
    getDisplayName: () => string;
    getIconType: () => string;
}[];
