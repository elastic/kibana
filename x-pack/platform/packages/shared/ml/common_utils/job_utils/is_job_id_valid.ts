/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';

// Job name must contain lowercase alphanumeric (a-z and 0-9), hyphens or underscores;
// it must also start and end with an alphanumeric character'
export function isJobIdValid(jobId: JobId): boolean {
  return /^[a-z0-9\-\_]+$/g.test(jobId) && !/^([_-].*)?(.*[_-])?$/g.test(jobId);
}
