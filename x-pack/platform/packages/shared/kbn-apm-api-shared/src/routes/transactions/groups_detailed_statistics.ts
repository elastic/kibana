/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { latencyAggregationTypeSchema, type Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kuerySchema,
  rangeSchema,
  offsetSchema,
  transactionDataSourceSchema,
} from '../../default_api_types';

export interface ServiceTransactionGroupDetailedStat {
  transactionName: string;
  latency: Coordinate[];
  throughput: Coordinate[];
  errorRate: Coordinate[];
  impact: number;
}

export interface ServiceTransactionGroupDetailedStatisticsResponse {
  currentPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
  previousPeriod: Record<string, ServiceTransactionGroupDetailedStat>;
}

// Equivalent of io-ts's jsonRt.pipe(t.array(t.string)): parse a JSON string,
// then validate the parsed value as an array of strings.
const transactionNamesSchema = z
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

export const transactionGroupsDetailedStatisticsRoute =
  defineRoute<ServiceTransactionGroupDetailedStatisticsResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/detailed_statistics',
    params: z.object({
      path: z.object({ serviceName: z.string() }),
      query: environmentSchema
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(offsetSchema)
        .merge(transactionDataSourceSchema)
        .merge(
          z.object({
            bucketSizeInSeconds: z.coerce.number(),
            useDurationSummary: BooleanFromString.default(false),
          })
        )
        .merge(
          z.object({
            transactionNames: transactionNamesSchema,
            transactionType: z.string(),
            latencyAggregationType: latencyAggregationTypeSchema,
          })
        ),
    }),
  });
