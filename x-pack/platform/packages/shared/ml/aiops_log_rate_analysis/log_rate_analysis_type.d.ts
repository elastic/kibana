/**
 * The type of log rate analysis (spike or dip) will affect how parameters are
 * passed to the analysis API endpoint.
 */
export declare const LOG_RATE_ANALYSIS_TYPE: {
    readonly SPIKE: "spike";
    readonly DIP: "dip";
};
/**
 * Union type of log rate analysis types.
 */
export type LogRateAnalysisType = (typeof LOG_RATE_ANALYSIS_TYPE)[keyof typeof LOG_RATE_ANALYSIS_TYPE];
