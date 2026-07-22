/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { environmentSchema, type CorrelationsResponse } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';
import { entityTypeSchema, metricSchema } from './types';

export type UnifiedCorrelationsRouteResponse = CorrelationsResponse;

export const unifiedCorrelationsRoute = defineRoute<UnifiedCorrelationsRouteResponse>()({
  endpoint: 'POST /internal/apm/correlations',
  params: z.object({
    body: z
      .object({
        entityType: entityTypeSchema,
        metric: metricSchema,
      })
      .extend({
        serviceName: z.string().optional(),
        transactionName: z.string().optional(),
        transactionType: z.string().optional(),
        fieldCandidates: z.array(z.string()).optional(),
        durationMin: z.coerce.number().optional(),
        durationMax: z.coerce.number().optional(),
        percentileThreshold: z.coerce.number().optional(),
        includeHistogram: BooleanFromString.optional(),
        kuery: z.string().optional(),
      })
      .merge(environmentSchema.partial())
      .merge(rangeSchema),
  }),
});
