/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { LOG_RATE_ANALYSIS_HIGHLIGHT_COLOR } from './log_rate_analysis/constants';
export { getLogRateAnalysisType } from './log_rate_analysis/get_log_rate_analysis_type';
export {
  LOG_RATE_ANALYSIS_TYPE,
  type LogRateAnalysisType,
} from './log_rate_analysis/log_rate_analysis_type';
export type { LogRateHistogramItem } from './log_rate_analysis/log_rate_histogram_item';
export type { DocumentCountStatsChangePoint } from './log_rate_analysis/types';
export type { WindowParameters } from './log_rate_analysis/window_parameters';
export { getSnappedTimestamps } from './log_rate_analysis/get_snapped_timestamps';
export { getSnappedWindowParameters } from './log_rate_analysis/get_snapped_window_parameters';
export { getWindowParameters } from './log_rate_analysis/get_window_parameters';
export { getWindowParametersForTrigger } from './log_rate_analysis/get_window_parameters_for_trigger';
export { getExtendedChangePoint } from './log_rate_analysis/get_extended_change_point';
