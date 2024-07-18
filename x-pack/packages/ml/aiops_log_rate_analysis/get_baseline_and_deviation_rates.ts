/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LOG_RATE_ANALYSIS_TYPE } from './log_rate_analysis_type';

export function getBaselineAndDeviationRates(
  analysisType: typeof LOG_RATE_ANALYSIS_TYPE[keyof typeof LOG_RATE_ANALYSIS_TYPE],
  baselineBuckets: number,
  deviationBuckets: number,
  docCount: number,
  bgCount: number
) {
  let baselineBucketRate;
  let deviationBucketRate;
  if (analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    baselineBucketRate = Math.round(bgCount / baselineBuckets);
    deviationBucketRate = Math.round(docCount / deviationBuckets);
  } else {
    // For dip, the "doc count" refers to the amount of documents in the baseline time range so we set baselineBucketRate
    baselineBucketRate = Math.round(docCount / baselineBuckets);
    deviationBucketRate = Math.round(bgCount / deviationBuckets);
  }

  return { baselineBucketRate, deviationBucketRate };
}
