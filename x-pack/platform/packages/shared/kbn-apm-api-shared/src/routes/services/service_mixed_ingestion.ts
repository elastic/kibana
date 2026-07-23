/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { IngestionTimeRanges } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface ServiceMixedIngestionResponse {
  hasMultipleAgentTypes: boolean;
  ingestionTimeRanges?: IngestionTimeRanges;
}

export const serviceMixedIngestionRoute = defineRoute<ServiceMixedIngestionResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/mixed_ingestion',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: environmentSchema.merge(kuerySchema).merge(rangeSchema),
  }),
});
