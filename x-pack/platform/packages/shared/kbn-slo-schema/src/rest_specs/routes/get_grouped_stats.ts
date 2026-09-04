/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { MAX_ARRAY_LENGTH, MAX_KEYWORD_LENGTH, MAX_QUERY_LENGTH } from '../../schema/zod/limits';

const apmBodyParamsSchema = z.object({
  type: z.literal('apm'),
  size: z.number().optional(),
  serviceNames: z.array(z.string().max(MAX_KEYWORD_LENGTH)).max(MAX_ARRAY_LENGTH).optional(),
  environment: z.string().max(MAX_KEYWORD_LENGTH).optional(),
  kqlQuery: z.string().max(MAX_QUERY_LENGTH).optional(),
  statusFilters: z.array(z.string().max(MAX_KEYWORD_LENGTH)).max(MAX_ARRAY_LENGTH).optional(),
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
