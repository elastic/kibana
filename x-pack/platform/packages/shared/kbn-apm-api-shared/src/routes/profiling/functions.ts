/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { TopNFunctions } from '@kbn/profiling-utils';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import {
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
  MAX_PROFILING_INDEX,
} from '../../constants';

export type ServicesFunctionsResponse = TopNFunctions;

export const servicesFunctionsRoute = defineRoute<ServicesFunctionsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/functions',
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
      query: environmentSchema
        .merge(rangeSchema)
        .merge(z.object({ transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH).optional() }))
        .merge(
          z.object({
            startIndex: z.coerce.number().int().min(0).max(MAX_PROFILING_INDEX),
            endIndex: z.coerce.number().int().min(0).max(MAX_PROFILING_INDEX),
            transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH),
          })
        )
        .merge(kuerySchema),
    })
  ),
});
