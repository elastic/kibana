/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Annotation } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface ServiceAnnotationResponse {
  annotations: Annotation[];
}

export const serviceAnnotationsSearchRoute = defineRoute<ServiceAnnotationResponse>()({
  endpoint: 'GET /api/apm/services/{serviceName}/annotation/search 2023-10-31',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: environmentSchema.merge(rangeSchema),
  }),
});
