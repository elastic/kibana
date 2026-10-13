/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { latencyAggregationTypeSchema } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, transactionDataSourceSchema } from '../../default_api_types';
import { MAX_FIELD_VALUE_LENGTH, MAX_KUERY_LENGTH } from '../../constants';

export interface MergedServiceTransactionGroupsResponse {
  transactionGroups: Array<{
    alertsCount: number;
    name: string;
    transactionType?: string;
    latency?: number | null;
    throughput?: number;
    errorRate?: number;
    impact?: number;
  }>;
  maxCountExceeded: boolean;
  transactionOverflowCount: number;
  hasActiveAlerts: boolean;
}

export const transactionGroupsMainStatisticsRoute =
  defineRoute<MergedServiceTransactionGroupsResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/transactions/groups/main_statistics',
    params: lazySchema(() =>
      z.object({
        path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
        query: z
          .object({ searchQuery: z.string().max(MAX_KUERY_LENGTH) })
          .partial()
          .merge(environmentSchema)
          .merge(rangeSchema)
          .merge(
            z.object({
              kuery: z.string().max(MAX_KUERY_LENGTH),
              useDurationSummary: BooleanFromString.default(false),
              transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH),
              latencyAggregationType: latencyAggregationTypeSchema,
            })
          )
          .merge(transactionDataSourceSchema),
      })
    ),
  });
