/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils/aggregation_types';

// Returns a boolean indicating whether the specified job is suitable for maps plugin.
export function isJobWithGeoData(job: Job): boolean {
  const { detectors } = job.analysis_config;
  return detectors.some((detector) => detector.function === ML_JOB_AGGREGATION.LAT_LONG);
}
