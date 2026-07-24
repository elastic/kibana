/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export type ServicesFunctionsResponse = TopNFunctions;

export const servicesFunctionsRoute = defineRoute<ServicesFunctionsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/functions',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: environmentSchema
      .merge(rangeSchema)
      .merge(z.object({ transactionName: z.string().optional() }))
      .merge(
        z.object({
          startIndex: z.coerce.number(),
          endIndex: z.coerce.number(),
          transactionType: z.string(),
        })
      )
      .merge(kuerySchema),
  }),
});
