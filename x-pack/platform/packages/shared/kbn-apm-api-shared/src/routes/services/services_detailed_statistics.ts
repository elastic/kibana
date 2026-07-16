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
  probabilitySchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';

export interface ServiceTransactionDetailedStat {
  serviceName: string;
  latency: Coordinate[];
  transactionErrorRate?: Coordinate[];
  throughput?: Coordinate[];
}

export interface ServiceTransactionDetailedStatPeriodsResponse {
  currentPeriod: Record<string, ServiceTransactionDetailedStat>;
  previousPeriod: Record<string, ServiceTransactionDetailedStat>;
}

// Equivalent of io-ts's jsonRt.pipe(t.array(t.string)): parse a JSON string,
// then validate the parsed value is an array of strings.
const serviceNamesJsonSchema = z
  .string()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.string()));

export const servicesDetailedStatisticsRoute =
  defineRoute<ServiceTransactionDetailedStatPeriodsResponse>()({
    endpoint: 'POST /internal/apm/services/detailed_statistics',
    params: z.object({
      query: environmentSchema
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(offsetSchema)
        .merge(probabilitySchema)
        .merge(serviceTransactionDataSourceSchema)
        .merge(
          z.object({
            bucketSizeInSeconds: z.coerce.number(),
          })
        ),
      body: z.object({ serviceNames: serviceNamesJsonSchema }),
    }),
  });
