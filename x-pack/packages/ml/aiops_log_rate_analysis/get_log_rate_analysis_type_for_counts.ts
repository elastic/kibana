/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE, type LogRateAnalysisType } from './log_rate_analysis_type';
import type { WindowParameters } from './window_parameters';

/**
 * Identify the log rate analysis type based on the baseline/deviation doc counts.
 *
 * @param baselineCount The baseline doc count.
 * @param deviationCount The deviation doc count.
 * @param windowParameters The window parameters with baseline and deviation time range.
 * @returns The log rate analysis type.
 */
export function getLogRateAnalysisTypeForCounts(
  baselineCount: number,
  deviationCount: number,
  windowParameters: WindowParameters
): LogRateAnalysisType {
  const { baselineMin, baselineMax, deviationMin, deviationMax } = windowParameters;

  const deviationDuration = deviationMax - deviationMin;
  const deviationPerBucket = deviationCount;

  const baselineNormalizedDuration = (baselineMax - baselineMin) / deviationDuration;
  const baselinePerBucket = baselineCount / baselineNormalizedDuration;

  return deviationPerBucket >= baselinePerBucket
    ? LOG_RATE_ANALYSIS_TYPE.SPIKE
    : LOG_RATE_ANALYSIS_TYPE.DIP;
}
