/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface ErrorGroupMainStatisticsResponse {
  errorGroups: Array<{
    groupId: string;
    name: string;
    lastSeen: number;
    occurrences: number;
    culprit: string | undefined;
    handled: boolean | undefined;
    type: string | undefined;
    traceId: string | undefined;
  }>;
  maxCountExceeded: boolean;
}

export const errorsMainStatisticsRoute = defineRoute<ErrorGroupMainStatisticsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({
        sortField: z.string().optional(),
        sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
        searchQuery: z.string().optional(),
      })
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});

export const errorsMainStatisticsByTransactionNameRoute =
  defineRoute<ErrorGroupMainStatisticsResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name',
    params: z.object({
      path: z.object({ serviceName: z.string() }),
      query: z
        .object({
          transactionType: z.string(),
          transactionName: z.string(),
          maxNumberOfErrorGroups: z.coerce.number(),
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema),
    }),
  });
