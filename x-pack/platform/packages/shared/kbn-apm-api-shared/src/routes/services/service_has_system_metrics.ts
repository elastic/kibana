/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';
import { MAX_SERVICE_NAME_LENGTH } from '../../constants';

export interface ServiceHasSystemMetricsResponse {
  hasSystemMetrics: boolean;
}

export const serviceHasSystemMetricsRoute = defineRoute<ServiceHasSystemMetricsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/has_system_metrics',
  params: z.object({
    path: z.object({ serviceName: z.string().max(MAX_SERVICE_NAME_LENGTH) }),
    query: environmentSchema.merge(rangeSchema),
  }),
});
