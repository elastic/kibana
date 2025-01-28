/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE, type LogRateAnalysisType } from './log_rate_analysis_type';

/**
 * Calculates the baseline and deviation rates for log rate analysis based on the specified analysis type.
 *
 * This function computes the rates by dividing the document count (docCount) and background count (bgCount)
 * by the number of buckets allocated for baseline and deviation periods, respectively. The calculation
 * method varies depending on whether the analysis type is a "spike" or a "dip". For a "spike", the baseline
 * rate is derived from the background count and the deviation rate from the document count. For a "dip",
 * the roles are reversed.
 *
 * @param analysisType The type of analysis to perform, can be either "spike" or "dip".
 * @param baselineBuckets The number of buckets into which the baseline period is divided.
 * @param deviationBuckets The number of buckets into which the deviation period is divided.
 * @param docCount The total document count observed in the deviation period.
 * @param bgCount The total background count observed in the baseline period.
 * @returns An object containing the calculated baseline and deviation bucket rates.
 */
export function getBaselineAndDeviationRates(
  analysisType: LogRateAnalysisType,
  baselineBuckets: number,
  deviationBuckets: number,
  docCount: number,
  bgCount: number
): { baselineBucketRate: number; deviationBucketRate: number } {
  if (baselineBuckets === 0 || deviationBuckets === 0) {
    return { baselineBucketRate: 0, deviationBucketRate: 0 };
  } else if (analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    return {
      baselineBucketRate: Math.round(bgCount / baselineBuckets),
      deviationBucketRate: Math.round(docCount / deviationBuckets),
    };
  } else {
    // For dip, the "doc count" refers to the amount of documents in the baseline time range so we set baselineBucketRate
    return {
      baselineBucketRate: Math.round(docCount / baselineBuckets),
      deviationBucketRate: Math.round(bgCount / deviationBuckets),
    };
  }
}
