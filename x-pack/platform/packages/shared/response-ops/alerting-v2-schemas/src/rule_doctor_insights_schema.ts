/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const insightStatusSchema = z.enum(['open', 'dismissed', 'applied']);
export type InsightStatus = z.infer<typeof insightStatusSchema>;

export const listInsightsQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1).describe('The page number to return.'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(1000)
    .optional()
    .default(20)
    .describe('The number of insights to return per page.'),
  status: insightStatusSchema.optional().describe('Filter insights by status.'),
  type: z.string().optional().describe('Filter insights by type.'),
  execution_id: z.string().optional().describe('Filter insights by execution ID.'),
  rule_ids: z.string().optional().describe('Comma-separated list of rule IDs to filter by.'),
});
export type ListInsightsQuery = z.infer<typeof listInsightsQuerySchema>;

export const getInsightParamsSchema = z.object({
  insight_id: z.string().describe('The identifier for the insight.'),
});
export type GetInsightParams = z.infer<typeof getInsightParamsSchema>;

export const updateInsightStatusParamsSchema = z.object({
  insight_id: z.string().describe('The identifier for the insight.'),
});
export type UpdateInsightStatusParams = z.infer<typeof updateInsightStatusParamsSchema>;

export const updateInsightStatusBodySchema = z.object({
  status: insightStatusSchema.describe('The new status for the insight.'),
});
export type UpdateInsightStatusBody = z.infer<typeof updateInsightStatusBodySchema>;
