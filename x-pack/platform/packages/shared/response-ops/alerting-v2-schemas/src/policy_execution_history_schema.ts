/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const POLICY_EXECUTION_HISTORY_MAX_PER_PAGE = 100;

export const policyExecutionOutcomeSchema = z.enum(['dispatched', 'throttled']);
export type PolicyExecutionOutcome = z.infer<typeof policyExecutionOutcomeSchema>;

export const listPolicyExecutionHistoryQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().describe('Page number (1-indexed).'),
  perPage: z.coerce
    .number()
    .min(1)
    .max(POLICY_EXECUTION_HISTORY_MAX_PER_PAGE)
    .optional()
    .describe('Number of events per page.'),
});
export type ListPolicyExecutionHistoryParams = z.infer<
  typeof listPolicyExecutionHistoryQuerySchema
>;

export const countPolicyExecutionEventsQuerySchema = z.object({
  since: z.string().describe('ISO timestamp; count events with @timestamp greater than this.'),
});
export type CountPolicyExecutionEventsParams = z.infer<
  typeof countPolicyExecutionEventsQuerySchema
>;

const namedRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
});

// Defensive upper bound to keep response payloads sane.
const MAX_WORKFLOWS_PER_ITEM = 100;

export const policyExecutionHistoryItemSchema = z.object({
  '@timestamp': z.string(),
  policy: namedRefSchema,
  rule: namedRefSchema,
  outcome: policyExecutionOutcomeSchema,
  episode_count: z.number(),
  action_group_count: z.number(),
  workflows: z.array(namedRefSchema).max(MAX_WORKFLOWS_PER_ITEM),
});
export type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;

export const listPolicyExecutionHistoryResponseSchema = z.object({
  items: z.array(policyExecutionHistoryItemSchema),
  page: z.number(),
  perPage: z.number(),
  totalEvents: z.number(),
});
export type ListPolicyExecutionHistoryResponse = z.infer<
  typeof listPolicyExecutionHistoryResponseSchema
>;

export const countPolicyExecutionEventsResponseSchema = z.object({
  count: z.number(),
});
export type CountPolicyExecutionEventsResponse = z.infer<
  typeof countPolicyExecutionEventsResponseSchema
>;
