/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, isoDateTime, lazySchema } from '@kbn/zod/v4';
import { arrayOrSingleSchema, ESTIMATED_COUNT_NOTE, queryIntSchema } from './common';
import {
  ID_MAX_LENGTH,
  EXECUTION_HISTORY_MAX_PER_PAGE,
  EXECUTION_HISTORY_DEFAULT_PER_PAGE,
  EXECUTION_HISTORY_MAX_RESULT_WINDOW,
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER,
  MAX_SEARCH_LENGTH,
} from './constants';

/**
 * Coarse ECS-aligned outcome (`event.outcome`) for a single rule execution.
 *
 * Pinned to Task Manager's actual contract for `task-run` events: the
 * `EventLogOutcomes` enum in `task_manager/server/constants.ts` only
 * emits `success` and `failure`, and no other producer writes
 * `event.action: 'task-run'`.
 *
 * The fine-grained product taxonomy
 * (`success | warning | failed | timeout | skipped`) sourced from
 * `kibana.alerting_v2.rule_executor.execution.status` will land later
 * as a separate field so cross-platform ECS consumers stay unaffected.
 */
export const ruleExecutionOutcomeSchema = lazySchema(() => z.enum(['success', 'failure']));
export type RuleExecutionOutcome = z.infer<typeof ruleExecutionOutcomeSchema>;

/**
 * Outcome filter. The array cap tracks the enum size — each value can appear
 * at most once. It auto-extends when new outcome values are added.
 */
const outcomeArraySchema = lazySchema(() =>
  arrayOrSingleSchema(ruleExecutionOutcomeSchema, ruleExecutionOutcomeSchema.options.length)
);

/**
 * Rule id filter. Each id must be a non-empty string up to {@link ID_MAX_LENGTH}
 * chars; the array is capped at {@link EXECUTION_HISTORY_MAX_RULE_ID_FILTER}.
 */
const ruleIdArraySchema = lazySchema(() =>
  arrayOrSingleSchema(
    z.string().trim().min(1).max(ID_MAX_LENGTH),
    EXECUTION_HISTORY_MAX_RULE_ID_FILTER
  )
);

export const listRuleExecutionsRequestSchema = lazySchema(() =>
  z
    .object({
      rule_ids: ruleIdArraySchema.optional().describe(`Rule id filter. `),
      search: z
        .string()
        .trim()
        .min(1)
        .max(MAX_SEARCH_LENGTH)
        .optional()
        .describe(
          'Free-text search. Matches rule name, description or rule ID (case-insensitive). Combined with rule_ids using AND.'
        ),
      outcomes: outcomeArraySchema.optional().describe('Outcome filter. '),
      from: isoDateTime().optional().describe('Inclusive ISO datetime lower bound on event.start.'),
      to: isoDateTime().optional().describe('Inclusive ISO datetime upper bound on event.start.'),
      sort_field: z
        .enum(['started_at', 'duration_ms'])
        .default('started_at')
        .describe('Sort field. Defaults to started_at.'),
      sort_order: z.enum(['asc', 'desc']).default('desc').describe('Sort direction.'),
      page: queryIntSchema({ min: 1, max: EXECUTION_HISTORY_MAX_RESULT_WINDOW })
        .default(1)
        .describe(`Page number.`),
      per_page: queryIntSchema({ min: 1, max: EXECUTION_HISTORY_MAX_PER_PAGE })
        .default(EXECUTION_HISTORY_DEFAULT_PER_PAGE)
        .describe(`Number of results per page.`),
    })
    .strict()
    .refine(
      ({ page, per_page: perPage }) => page * perPage <= EXECUTION_HISTORY_MAX_RESULT_WINDOW,
      {
        message: `page * per_page cannot exceed ${EXECUTION_HISTORY_MAX_RESULT_WINDOW}.`,
        path: ['page'],
      }
    )
);
export type ListRuleExecutionsRequest = z.infer<typeof listRuleExecutionsRequestSchema>;

export const ruleExecutionViewSchema = lazySchema(() =>
  z
    .object({
      id: z.string(),
      rule: z.object({
        id: z.string(),
        version: z
          .number()
          .int()
          .optional()
          .describe(
            'The rule version this run executed. Omitted until the rule executor emits its own event; the `task-run` event does not carry one.'
          ),
      }),
      space_id: z.string(),
      started_at: isoDateTime(),
      ended_at: isoDateTime(),
      timings: z.object({
        duration_ms: z
          .number()
          .int()
          .nonnegative()
          .describe('Wall-clock duration of the run, in milliseconds.'),
        scheduled_delay_ms: z
          .number()
          .int()
          .describe(
            'Delay between the scheduled run time and the actual start, in milliseconds. Negative when the run started ahead of its scheduled time.'
          ),
      }),
      outcome: ruleExecutionOutcomeSchema,
      reason: z
        .string()
        .optional()
        .describe('Why the run ended the way it did. Omitted when the source recorded no reason.'),
      error: z
        .object({
          message: z.string(),
          stack_trace: z.string().optional().describe('Omitted when the source recorded no trace.'),
        })
        .optional()
        .describe(
          'Failure details. Omitted on a successful run, or when the failure was unclassified.'
        ),
    })
    .meta({ id: 'alerting_rule_execution' })
);

export type RuleExecutionView = z.infer<typeof ruleExecutionViewSchema>;

export const ruleSearchMatchCountsSchema = lazySchema(() =>
  z.object({
    rules: z.number().describe(`Rules matching the search. ${ESTIMATED_COUNT_NOTE}`),
    is_truncated: z
      .boolean()
      .describe(
        'True when more than 500 rules matched the search. Only the executions of the first 500 matching rules are returned, so the results are incomplete. Narrow the search to see the rest.'
      ),
  })
);
export type RuleSearchMatchCounts = z.infer<typeof ruleSearchMatchCountsSchema>;

export const listRuleExecutionsResponseSchema = lazySchema(() =>
  z
    .object({
      items: z.array(ruleExecutionViewSchema),
      total: z
        .number()
        .int()
        .nonnegative()
        .describe(`The number of rule executions matching the query. ${ESTIMATED_COUNT_NOTE}`),
      page: z.number().int().min(1),
      per_page: z.number().int().min(1),
      search_matches: ruleSearchMatchCountsSchema
        .optional()
        .describe('Match counts for the active search. Omitted when no search was provided.'),
    })
    .meta({ id: 'alerting_rule_executions_response' })
);

export type ListRuleExecutionsResponse = z.infer<typeof listRuleExecutionsResponseSchema>;
