/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ServiceSchemaType } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';
import { MAX_SERVICE_NAME_LENGTH } from '../../constants';

export interface ServiceIngestionTypeResponse {
  schema: ServiceSchemaType;
}

export const serviceIngestionTypeRoute = defineRoute<ServiceIngestionTypeResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/ingestion_type',
  params: z.object({
    path: z.object({ serviceName: z.string().max(MAX_SERVICE_NAME_LENGTH) }),
    query: environmentSchema.merge(rangeSchema),
  }),
});
