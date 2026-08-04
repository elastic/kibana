import type { LogRateAnalysisType } from './log_rate_analysis_type';
/**
 * Calculates the change in log rate between two time periods and generates a descriptive message.
 * It return the factor as a number as well as a human readable message.
 *
 * @param analysisType The type of log rate analysis (spike or dip).
 * @param baselineBucketRate The log rate (document count per unit time) during the baseline period.
 * @param deviationBucketRate The log rate (document count per unit time) during the deviation period.
 * @returns An object containing the message describing the rate change and the factor of change if applicable.
 */
export declare function getLogRateChange(analysisType: LogRateAnalysisType, baselineBucketRate: number, deviationBucketRate: number): {
    message: string;
    factor?: number;
};
