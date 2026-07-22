/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { type AgentName, environmentSchema } from '@kbn/apm-types';
import type { TRANSACTION_NAME, SERVICE_NAME } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, probabilitySchema } from '../../default_api_types';

export type BucketKey = Record<typeof TRANSACTION_NAME | typeof SERVICE_NAME, string>;

export interface TopTracesPrimaryStatsResponse {
  items: Array<{
    key: BucketKey;
    serviceName: string;
    transactionName: string;
    averageResponseTime: number | null;
    transactionsPerMinute: number;
    transactionType: string;
    impact: number;
    agentName: AgentName;
  }>;
}

export const tracesRoute = defineRoute<TopTracesPrimaryStatsResponse>()({
  endpoint: 'GET /internal/apm/traces',
  params: z.object({
    query: environmentSchema.merge(kuerySchema).merge(rangeSchema).merge(probabilitySchema),
  }),
});
