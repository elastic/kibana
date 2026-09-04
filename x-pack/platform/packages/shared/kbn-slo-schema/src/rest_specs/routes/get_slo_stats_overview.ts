/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';

import { MAX_QUERY_LENGTH } from '../../schema/zod/limits';

const getSLOStatsOverviewParamsSchema = z.object({
  query: z
    .object({
      kqlQuery: z.string().max(MAX_QUERY_LENGTH).optional(),
      filters: z.string().max(MAX_QUERY_LENGTH).optional(),
    })
    .optional(),
});

const getSLOStatsOverviewResponseSchema = z.object({
  violated: z.number(),
  degrading: z.number(),
  stale: z.number(),
  healthy: z.number(),
  noData: z.number(),
  burnRateRules: z.number(),
  burnRateActiveAlerts: z.number(),
  burnRateRecoveredAlerts: z.number(),
});

type GetSLOStatsOverviewParams = NonNullable<
  z.output<typeof getSLOStatsOverviewParamsSchema.shape.query>
>;
type GetSLOStatsOverviewResponse = z.output<typeof getSLOStatsOverviewResponseSchema>;

export { getSLOStatsOverviewParamsSchema, getSLOStatsOverviewResponseSchema };
export type { GetSLOStatsOverviewParams, GetSLOStatsOverviewResponse };
