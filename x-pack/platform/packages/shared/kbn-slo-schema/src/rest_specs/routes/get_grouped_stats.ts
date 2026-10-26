/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

const apmBodyParamsSchema = z.object({
  type: z.literal('apm'),
  // Number of buckets to return; Elasticsearch defaults to 10 when omitted.
  size: z.number().optional(),
  serviceNames: z.array(z.string()).optional(),
  environment: z.string().optional(),
  kqlQuery: z.string().optional(),
  statusFilters: z.array(z.string()).optional(),
});

const getSLOGroupedStatsParamsSchema = z.object({
  body: apmBodyParamsSchema,
});

interface GroupedStatsResult {
  entity: string;
  summary: { violated: number; degrading: number; healthy: number; noData: number };
}

interface GetSLOGroupedStatsResponse {
  results: Array<GroupedStatsResult>;
}

type GetSLOGroupedStatsParams = z.output<typeof getSLOGroupedStatsParamsSchema>['body'];

export { getSLOGroupedStatsParamsSchema };

export type { GroupedStatsResult, GetSLOGroupedStatsParams, GetSLOGroupedStatsResponse };
