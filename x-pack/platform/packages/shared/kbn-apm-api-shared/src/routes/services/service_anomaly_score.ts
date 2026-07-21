/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AnomalyDetectorType, Environment } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface ServiceAnomalyScoreResponse {
  anomalyScore?: number;
  detectorType?: AnomalyDetectorType;
  anomalyEnvironment?: Environment;
}

export const serviceAnomalyScoreRoute = defineRoute<ServiceAnomalyScoreResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/anomaly_score',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: rangeSchema.merge(environmentSchema),
  }),
});
