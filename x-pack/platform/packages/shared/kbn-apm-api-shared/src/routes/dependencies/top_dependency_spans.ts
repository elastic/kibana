/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AgentName, EventOutcome } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema } from '../../default_api_types';

export interface DependencySpan {
  '@timestamp': number;
  spanId: string;
  spanName: string;
  serviceName: string;
  agentName: AgentName;
  traceId: string;
  transactionId?: string;
  transactionType?: string;
  transactionName?: string;
  duration: number;
  outcome: EventOutcome;
}

export interface TopDependencySpansResponse {
  spans: DependencySpan[];
}

export const topDependencySpansRoute = defineRoute<TopDependencySpansResponse>()({
  endpoint: 'GET /internal/apm/dependencies/operations/spans',
  params: z.object({
    query: rangeSchema
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(z.object({ dependencyName: z.string(), spanName: z.string() }))
      .merge(
        z.object({
          sampleRangeFrom: z.coerce.number().optional(),
          sampleRangeTo: z.coerce.number().optional(),
        })
      ),
  }),
});
