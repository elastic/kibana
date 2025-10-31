/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

// Returns whether the version of the job (the version number of the elastic stack that the job was
// created with) is greater than or equal to the supplied version (e.g. '6.1.0').
export function isJobVersionGte(job: CombinedJob, version: string): boolean {
  const jobVersion = job.job_version ?? '0.0.0';
  return semverGte(jobVersion, version);
}
