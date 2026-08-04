import { type LogRateAnalysisType } from './log_rate_analysis_type';
import type { LogRateHistogramItem } from './log_rate_histogram_item';
import type { WindowParameters } from './window_parameters';
/**
 * Identify the log rate analysis type based on the baseline/deviation
 * time ranges on a given log rate histogram.
 *
 * @param logRateHistogram The log rate histogram.
 * @param windowParameters The window parameters with baseline and deviation time range.
 * @returns The log rate analysis type.
 */
export declare function getLogRateAnalysisTypeForHistogram(logRateHistogram: LogRateHistogramItem[], windowParameters: WindowParameters): LogRateAnalysisType;
