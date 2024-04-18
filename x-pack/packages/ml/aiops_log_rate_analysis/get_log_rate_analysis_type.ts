/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { median } from 'd3-array';

import { LOG_RATE_ANALYSIS_TYPE, type LogRateAnalysisType } from './log_rate_analysis_type';
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
export function getLogRateAnalysisType(
  logRateHistogram: LogRateHistogramItem[],
  windowParameters: WindowParameters
): LogRateAnalysisType {
  const { baselineMin, baselineMax, deviationMin, deviationMax } = windowParameters;
  const baselineItems = logRateHistogram.filter(
    (d) => d.time >= baselineMin && d.time < baselineMax
  );
  const baselineMedian = median(baselineItems.map((d) => d.value)) ?? 0;

  const deviationItems = logRateHistogram.filter(
    (d) => d.time >= deviationMin && d.time < deviationMax
  );
  const deviationMedian = median(deviationItems.map((d) => d.value)) ?? 0;

  return deviationMedian >= baselineMedian
    ? LOG_RATE_ANALYSIS_TYPE.SPIKE
    : LOG_RATE_ANALYSIS_TYPE.DIP;
}
