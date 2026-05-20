import { type LogRateAnalysisType } from './log_rate_analysis_type';
import type { WindowParameters } from './window_parameters';
interface GetLogRateAnalysisTypeForCountsParams {
    baselineCount: number;
    deviationCount: number;
    windowParameters: WindowParameters;
}
/**
 * Identify the log rate analysis type based on the baseline/deviation doc counts.
 */
export declare function getLogRateAnalysisTypeForCounts({ baselineCount, deviationCount, windowParameters, }: GetLogRateAnalysisTypeForCountsParams): LogRateAnalysisType;
export {};
