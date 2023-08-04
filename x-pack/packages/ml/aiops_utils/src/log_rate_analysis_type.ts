/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { median } from 'd3-array';

import type { WindowParameters } from './window_parameters';

/**
 * The type of log rate analysis (spike or dip) will affect how parameters are
 * passed to the analysis API endpoint.
 */
export const LOG_RATE_ANALYSIS_TYPE = {
  SPIKE: 'spike',
  DIP: 'dip',
} as const;

/**
 * Union type of log rate analysis types.
 */
export type LogRateAnalysisType =
  typeof LOG_RATE_ANALYSIS_TYPE[keyof typeof LOG_RATE_ANALYSIS_TYPE];

/**
 * Log rate histogram item
 */
export interface LogRateHistogramItem {
  /**
   * Time of bucket
   */
  time: number | string;
  /**
   * Number of doc count for that time bucket
   */
  value: number;
}

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
