/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmMlJob } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface AnomalyDetectionJobsResponse {
  jobs: ApmMlJob[];
  hasLegacyJobs: boolean;
}

export const anomalyDetectionJobsRoute = defineRoute<AnomalyDetectionJobsResponse>()({
  endpoint: 'GET /internal/apm/settings/anomaly-detection/jobs',
});
