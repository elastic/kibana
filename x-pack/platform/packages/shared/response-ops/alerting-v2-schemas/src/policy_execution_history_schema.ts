/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, isoDateTime } from '@kbn/zod/v4';
import { arrayOrSingleSchema, ESTIMATED_COUNT_NOTE, queryIntSchema } from './common';
import {
  ID_MAX_LENGTH,
  MAX_SEARCH_LENGTH,
  EXECUTION_HISTORY_MAX_PER_PAGE,
  EXECUTION_HISTORY_DEFAULT_PER_PAGE,
  EXECUTION_HISTORY_MAX_RESULT_WINDOW,
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER,
} from './constants';

/**
 * Id filter shared by the rule_ids and alert_ids query params.
 */
const idFilterArraySchema = arrayOrSingleSchema(
  z.string().trim().min(1).max(ID_MAX_LENGTH),
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER
);

export const policyExecutionOutcomeSchema = z.enum(['success', 'throttled', 'failure']);
export type PolicyExecutionOutcome = z.infer<typeof policyExecutionOutcomeSchema>;

export const dispatchFailureReasonSchema = z.enum([
  'missing_api_key',
  'workflow_not_found',
  'workflow_disabled',
  'schedule_error',
  'license_not_supported',
]);
export type DispatchFailureReason = z.infer<typeof dispatchFailureReasonSchema>;

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
      'Explicit rule filter. Narrows events to those referencing at least one of the provided rule IDs. Also unions with the search filter if both are provided.'
    ),
  outcomes: policyExecutionOutcomeFilterSchema
    .optional()
    .describe(
      'Outcome filter. When omitted matches all outcomes. Pass one or more of "success", "throttled", "failure" to narrow.'
    ),
};

export const listPolicyExecutionHistoryRequestSchema = z
  .object({
    page: queryIntSchema({ min: 1, max: EXECUTION_HISTORY_MAX_RESULT_WINDOW })
      .default(1)
      .describe('Page number (1-indexed). Defaults to 1.'),
    per_page: queryIntSchema({ min: 1, max: EXECUTION_HISTORY_MAX_PER_PAGE })
      .default(EXECUTION_HISTORY_DEFAULT_PER_PAGE)
      .describe(`Number of events per page. Defaults to ${EXECUTION_HISTORY_DEFAULT_PER_PAGE}.`),
    from: isoDateTime()
      .optional()
      .describe(
        'Inclusive ISO datetime lower bound on the event timestamp; overrides the default 24-hour window. Independent of alert_ids — e.g. set it to an alert’s start time to scope results to that alert’s lifetime.'
      ),
    to: isoDateTime()
      .optional()
      .describe('Inclusive ISO datetime upper bound on the event timestamp.'),
    alert_ids: idFilterArraySchema
      .optional()
      .describe(
        'Alert filter. Narrows events to those referencing at least one of the provided alert IDs.'
      ),
    sort_field: z
      .enum(['dispatched_at'])
      .default('dispatched_at')
      .describe('Sort field. Defaults to "dispatched_at".'),
    sort_order: z
      .enum(['asc', 'desc'])
      .default('desc')
      .describe('Sort direction. Defaults to "desc".'),
    ...sharedFilterFields,
  })
  .strict()
  .refine(({ page, per_page: perPage }) => page * perPage <= EXECUTION_HISTORY_MAX_RESULT_WINDOW, {
    message: `page * per_page cannot exceed ${EXECUTION_HISTORY_MAX_RESULT_WINDOW}.`,
    path: ['page'],
  });

/**
 * Request-side params for the list endpoint (snake_case API contract). All
 * fields are optional: `page`/`per_page` default server-side and the filters
 * are opt-in, so callers building query strings need not supply pagination.
 */
export type ListPolicyExecutionHistoryRequest = z.infer<
  typeof listPolicyExecutionHistoryRequestSchema
>;

export const namedRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
});

// Defensive upper bounds to keep response payloads sane.
const MAX_WORKFLOWS_PER_ITEM = 100;
// Cap for the embedded `rules` array in each item. A broad Action Policy can
// emit one event referencing thousands of rules; the response only carries a
// bounded sample and clients rely on `rule_count` for the true count.
export const MAX_EMBEDDED_RULES_PER_ITEM = 20;
// Cap for the embedded `alerts` array in each item.
export const MAX_EMBEDDED_ALERTS_PER_ITEM = 50;

const alertRefSchema = z.object({ id: z.string() });

export const policyExecutionHistoryItemSchema = z
  .object({
    dispatched_at: isoDateTime(),
    policy: namedRefSchema,
    outcome: policyExecutionOutcomeSchema,
    alert_count: z.number(),
    alerts: z
      .array(alertRefSchema)
      .max(MAX_EMBEDDED_ALERTS_PER_ITEM)
      .describe(
        `Alert IDs referenced by this event, bounded to ${MAX_EMBEDDED_ALERTS_PER_ITEM}. Empty when the event references no alerts. Use \`alert_count\` for the true total.`
      ),
    action_group_count: z.number(),
    rules: z
      .array(namedRefSchema)
      .max(MAX_EMBEDDED_RULES_PER_ITEM)
      .describe(
        `Rules referenced by this event, bounded to ${MAX_EMBEDDED_RULES_PER_ITEM}. When a search or rule filter narrows the match, this array is intersected with the matched subset server-side. Use \`rule_count\` for the full count.`
      ),
    rule_count: z
      .number()
      .describe(
        'Number of rules referenced by this event after search or rule-filter narrowing. Unlike `total` on a list response, this is an exact count and it can exceed `rules.length` when the embedded array is truncated to the cap.'
      ),
    workflows: z.array(namedRefSchema).max(MAX_WORKFLOWS_PER_ITEM),
    failure_reason: dispatchFailureReasonSchema.optional(),
    error: z
      .object({
        message: z.string(),
        stack_trace: z.string().nullable(),
      })
      .nullable(),
  })
  .meta({ id: 'alerting_policy_execution_history_item' });

export type PolicyExecutionHistoryItem = z.infer<typeof policyExecutionHistoryItemSchema>;

export const searchMatchCountsSchema = z.object({
  policies: z.number().describe(`Policies matching the search. ${ESTIMATED_COUNT_NOTE}`),
  rules: z.number().describe(`Rules matching the search. ${ESTIMATED_COUNT_NOTE}`),
  is_truncated: z
    .boolean()
    .describe('True when the server filter cap was reached and results may be truncated.'),
});
export type SearchMatchCounts = z.infer<typeof searchMatchCountsSchema>;

export const listPolicyExecutionHistoryResponseSchema = z
  .object({
    items: z.array(policyExecutionHistoryItemSchema),
    page: z.number().int().min(1),
    per_page: z.number().int().min(1),
    total: z
      .number()
      .int()
      .nonnegative()
      .describe(`The number of action policy events matching the query. ${ESTIMATED_COUNT_NOTE}`),
    search_matches: searchMatchCountsSchema
      .nullable()
      .describe(
        'Per-type match counts for the active search. Null when no search was provided. When is_truncated is true the server ID filter was capped and the result may be truncated.'
      ),
  })
  .meta({ id: 'alerting_policy_execution_history_response' });

export type ListPolicyExecutionHistoryResponse = z.infer<
  typeof listPolicyExecutionHistoryResponseSchema
>;
