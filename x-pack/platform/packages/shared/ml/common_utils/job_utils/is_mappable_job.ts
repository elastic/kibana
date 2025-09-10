/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils/aggregation_types';

// Returns a flag to indicate whether the specified job is suitable for embedded map viewing.
export function isMappableJob(job: CombinedJob, detectorIndex: number): boolean {
  let isMappable = false;
  const { detectors } = job.analysis_config;
  if (detectorIndex >= 0 && detectorIndex < detectors.length) {
    const dtr = detectors[detectorIndex];
    const functionName = dtr.function;
    isMappable = functionName === ML_JOB_AGGREGATION.LAT_LONG;
  }
  return isMappable;
}
