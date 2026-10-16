/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { environmentSchema, type CorrelationsResponse } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';
import { entityTypeSchema, metricSchema } from './types';
import {
  MAX_ARRAY_ITEMS,
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
  MAX_KUERY_LENGTH,
} from '../../constants';

export type UnifiedCorrelationsRouteResponse = CorrelationsResponse;

export const unifiedCorrelationsRoute = defineRoute<UnifiedCorrelationsRouteResponse>()({
  endpoint: 'POST /internal/apm/correlations',
  params: lazySchema(() =>
    z.object({
      body: z
        .object({
          entityType: entityTypeSchema,
          metric: metricSchema,
        })
        .extend({
          serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH).optional(),
          transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          fieldCandidates: z
            .array(z.string().max(MAX_FIELD_VALUE_LENGTH))
            .max(MAX_ARRAY_ITEMS)
            .optional(),
          durationMin: z.coerce.number().optional(),
          durationMax: z.coerce.number().optional(),
          percentileThreshold: z.coerce.number().min(0).max(100).optional(),
          includeHistogram: BooleanFromString.optional(),
          kuery: z.string().max(MAX_KUERY_LENGTH).optional(),
        })
        .merge(environmentSchema.partial())
        .merge(rangeSchema),
    })
  ),
});
