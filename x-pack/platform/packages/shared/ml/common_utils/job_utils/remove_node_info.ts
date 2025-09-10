/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { CombinedJobWithStats } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';

export function removeNodeInfo(job: CombinedJobWithStats) {
  const newJob = cloneDeep(job);
  if (newJob.node !== undefined) {
    delete newJob.node;
  }
  if (newJob.datafeed_config?.node !== undefined) {
    delete newJob.datafeed_config.node;
  }
  return newJob;
}
