/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kuerySchema,
  rangeSchema,
  offsetSchema,
  filtersSchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';

export type ServiceThroughputResponse = Coordinate[];

export interface ServiceThroughputRouteResponse {
  currentPeriod: ServiceThroughputResponse;
  previousPeriod: ServiceThroughputResponse;
}

export const serviceThroughputRoute = defineRoute<ServiceThroughputRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/throughput',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({ bucketSizeInSeconds: z.coerce.number() })
      .merge(
        z
          .object({
            transactionType: z.string(),
            transactionName: z.string(),
            filters: filtersSchema,
          })
          .partial()
      )
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(offsetSchema)
      .merge(serviceTransactionDataSourceSchema),
  }),
});
