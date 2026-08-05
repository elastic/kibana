/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { arrayOrSingleSchema, queryIntSchema } from './common';
import {
  ID_MAX_LENGTH,
  MAX_SEARCH_LENGTH,
  EXECUTION_HISTORY_MAX_PER_PAGE,
  EXECUTION_HISTORY_DEFAULT_PER_PAGE,
  EXECUTION_HISTORY_MAX_RESULT_WINDOW,
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER,
} from './constants';

/**
 * Id filter shared by the rule_ids and episode_ids query params.
 */
const idFilterArraySchema = arrayOrSingleSchema(
  z.string().trim().min(1).max(ID_MAX_LENGTH),
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER
);

export const policyExecutionOutcomeSchema = z.enum(['dispatched', 'throttled', 'dispatch_failed']);
export type PolicyExecutionOutcome = z.infer<typeof policyExecutionOutcomeSchema>;

export const policyExecutionOutcomeFilterSchema = arrayOrSingleSchema(
  policyExecutionOutcomeSchema,
  policyExecutionOutcomeSchema.options.length
);
export type PolicyExecutionOutcomeFilter = z.infer<typeof policyExecutionOutcomeFilterSchema>;

const sharedFilterFields = {
  search: z
    .string()
    .trim()
    .min(1)
    .max(MAX_SEARCH_LENGTH)
    .optional()
    .describe(
      'Free-text search. Matches policy name, rule name, policy/rule ID (case-insensitive).'
    ),
  rule_ids: idFilterArraySchema
    .optional()
    .describe(
      'Explicit rule filter. Narrows events to those referencing at least one of the provided rule ids. Also unions with the search filter if both are provided.'
    ),
  outcome: policyExecutionOutcomeFilterSchema
    .optional()
    .describe(
      'Outcome filter. When omitted matches all outcomes. Pass one or more of "dispatched", "throttled", "dispatch_failed" to narrow.'
    ),
};

export const listPolicyExecutionHistoryRequestSchema = z
  .object({
    page: queryIntSchema({ min: 1, max: EXECUTION_HISTORY_MAX_RESULT_WINDOW })
      .optional()
      .describe('Page number (1-indexed). Defaults to 1.'),
    per_page: queryIntSchema({ min: 0, max: EXECUTION_HISTORY_MAX_PER_PAGE })
      .optional()
      .describe(
        `Number of events per page. Defaults to ${EXECUTION_HISTORY_DEFAULT_PER_PAGE}. Pass 0 for a count-only read.`
      ),
    start_date: z.iso
      .datetime()
      .optional()
      .describe(
        'Inclusive ISO datetime lower bound on the event timestamp; overrides the default 24-hour window. Independent of episode_ids — e.g. set it to an episode’s start time to scope results to that episode’s lifetime.'
      ),
    episode_ids: idFilterArraySchema
      .optional()
      .describe(
        'Episode filter. Narrows events to those referencing at least one of the provided episode ids.'
      ),
    ...sharedFilterFields,
  })
  .refine(
    ({ page = 1, per_page: perPage = EXECUTION_HISTORY_DEFAULT_PER_PAGE }) =>
      page * perPage <= EXECUTION_HISTORY_MAX_RESULT_WINDOW,
    {
      message: `page * per_page cannot exceed ${EXECUTION_HISTORY_MAX_RESULT_WINDOW}.`,
      path: ['page'],
    }
  );

/**
 * Request-side params for the list endpoint (snake_case API contract). All
 * fields are optional: `page`/`per_page` default server-side and the filters
 * are opt-in, so callers building query strings need not supply pagination.
 */
export type ListPolicyExecutionHistoryRequest = z.infer<
  typeof listPolicyExecutionHistoryRequestSchema
>;

const namedRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
});

// Defensive upper bounds to keep response payloads sane.
const MAX_WORKFLOWS_PER_ITEM = 100;
// Cap for the embedded `rules` array in each item. A broad Action Policy can
// emit one event referencing thousands of rules; the response only carries a
// bounded sample and clients rely on `totalRuleCount` for the true count.
export const MAX_EMBEDDED_RULES_PER_ITEM = 20;

export const policyExecutionHistoryItemSchema = z.object({
  dispatched_at: z.string(),
  policy: namedRefSchema,
  outcome: policyExecutionOutcomeSchema,
  episode_count: z.number(),
  action_group_count: z.number(),
  rules: z
    .array(namedRefSchema)
    .max(MAX_EMBEDDED_RULES_PER_ITEM)
    .describe(
      'Rules referenced by this event, bounded to MAX_EMBEDDED_RULES_PER_ITEM. When a search or rule filter narrows the match, this array is intersected with the matched subset server-side. Use `totalRuleCount` for the full count.'
    ),
  totalRuleCount: z
    .number()
    .describe(
      'Total number of rules referenced by this event after search / rule-filter narrowing. May exceed `rules.length` when the embedded array is truncated to the cap.'
    ),
  workflows: z.array(namedRefSchema).max(MAX_WORKFLOWS_PER_ITEM),
});
export type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;

export const searchMatchCountsSchema = z.object({
  policies: z.number().describe('Total policies matching the search.'),
  rules: z.number().describe('Total rules matching the search.'),
  cap: z.number().describe('Maximum number of policy/rule ids the server uses as a filter.'),
});
export type SearchMatchCounts = z.infer<typeof searchMatchCountsSchema>;

export const listPolicyExecutionHistoryResponseSchema = z.object({
  items: z.array(policyExecutionHistoryItemSchema),
  page: z.number().int().min(1),
  // Allows 0 for count-only reads (perPage=0), unlike the rule executions response.
  perPage: z.number().int().min(0),
  totalEvents: z.number().int().nonnegative(),
  searchMatches: searchMatchCountsSchema
    .nullable()
    .describe(
      'Per-type match counts for the active search, plus the cap used as filter. Null when no search was provided. When policies > cap or rules > cap the result is truncated.'
    ),
});
export type ListPolicyExecutionHistoryResponse = z.infer<
  typeof listPolicyExecutionHistoryResponseSchema
>;
