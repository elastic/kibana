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
import {
  kuerySchema,
  rangeSchema,
  offsetSchema,
  filtersSchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';
import { MAX_DOCUMENT_VALUE_LENGTH, MAX_FIELD_VALUE_LENGTH } from '../../constants';

export type ServiceThroughputResponse = Coordinate[];

export interface ServiceThroughputRouteResponse {
  currentPeriod: ServiceThroughputResponse;
  previousPeriod: ServiceThroughputResponse;
}

export const serviceThroughputRoute = defineRoute<ServiceThroughputRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/throughput',
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
      query: z
        .object({ bucketSizeInSeconds: z.coerce.number().min(1) })
        .merge(
          z
            .object({
              transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH),
              transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH),
              filters: filtersSchema,
            })
            .partial()
        )
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(offsetSchema)
        .merge(serviceTransactionDataSourceSchema),
    })
  ),
});
