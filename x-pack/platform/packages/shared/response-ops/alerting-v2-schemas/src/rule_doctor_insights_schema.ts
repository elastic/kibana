/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ID_MAX_LENGTH, MAX_BULK_ITEMS } from './constants';

export const insightStatusSchema = z.enum(['open', 'dismissed', 'applied']);
export type InsightStatus = z.infer<typeof insightStatusSchema>;

const ruleIdSchema = z.string().min(1).max(ID_MAX_LENGTH);

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
  type: z.string().min(1).max(128).optional().describe('Filter insights by type.'),
  execution_id: z
    .string()
    .min(1)
    .max(ID_MAX_LENGTH)
    .optional()
    .describe('Filter insights by execution ID.'),
  rule_ids: z
    .union([ruleIdSchema, z.array(ruleIdSchema)])
    .transform((v) => (Array.isArray(v) ? v : [v]).map((id) => id.trim()).filter(Boolean))
    .pipe(z.array(ruleIdSchema).max(MAX_BULK_ITEMS))
    .optional()
    .describe('Filter by rule IDs. Accepts a single ID or an array of IDs.'),
});
export type ListInsightsQuery = z.infer<typeof listInsightsQuerySchema>;

export const getInsightParamsSchema = z.object({
  insight_id: z.string().min(1).max(ID_MAX_LENGTH).describe('The identifier for the insight.'),
});
export type GetInsightParams = z.infer<typeof getInsightParamsSchema>;

export const updateInsightStatusParamsSchema = z.object({
  insight_id: z.string().min(1).max(ID_MAX_LENGTH).describe('The identifier for the insight.'),
});
export type UpdateInsightStatusParams = z.infer<typeof updateInsightStatusParamsSchema>;

export const updateInsightStatusBodySchema = z.object({
  status: insightStatusSchema.describe('The new status for the insight.'),
});
export type UpdateInsightStatusBody = z.infer<typeof updateInsightStatusBodySchema>;
