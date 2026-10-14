/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import {
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
  MAX_KUERY_LENGTH,
} from '../../constants';

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
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
      query: z
        .object({
          sortField: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          sortDirection: z.union([z.literal('asc'), z.literal('desc')]).optional(),
          searchQuery: z.string().max(MAX_KUERY_LENGTH).optional(),
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema),
    })
  ),
});

export const errorsMainStatisticsByTransactionNameRoute =
  defineRoute<ErrorGroupMainStatisticsResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/errors/groups/main_statistics_by_transaction_name',
    params: lazySchema(() =>
      z.object({
        path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
        query: z
          .object({
            transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH),
            transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH),
            maxNumberOfErrorGroups: z.coerce.number().int().min(1).max(100),
          })
          .merge(environmentSchema)
          .merge(kuerySchema)
          .merge(rangeSchema),
      })
    ),
  });
