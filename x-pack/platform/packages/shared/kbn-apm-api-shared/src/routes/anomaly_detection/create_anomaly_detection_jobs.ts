/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentStringSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';

export interface CreateAnomalyDetectionJobsResponse {
  jobCreated: true;
}

export const createAnomalyDetectionJobsRoute = defineRoute<CreateAnomalyDetectionJobsResponse>()({
  endpoint: 'POST /internal/apm/settings/anomaly-detection/jobs',
  params: z.object({
    body: z.object({
      environments: z.array(environmentStringSchema),
    }),
  }),
});
