/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Environment } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface EnvironmentsResponse {
  environments: Environment[];
}

export const environmentsRoute = defineRoute<EnvironmentsResponse>()({
  endpoint: 'GET /internal/apm/environments',
  params: z.object({
    query: rangeSchema.extend({ serviceName: z.string().optional() }),
  }),
});
