/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';
import { MAX_DOCUMENT_VALUE_LENGTH, MAX_FIELD_VALUE_LENGTH } from '../../constants';

export interface ErrorDistributionResponse {
  currentPeriod: Array<{ x: number; y: number }>;
  previousPeriod: Coordinate[];
  bucketSize: number;
}

export const errorDistributionRoute = defineRoute<ErrorDistributionResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/distribution',
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
      query: z
        .object({
          groupId: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH).optional(),
          bucketSizeInSeconds: z.coerce.number().min(1).optional(),
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(offsetSchema),
    })
  ),
});
