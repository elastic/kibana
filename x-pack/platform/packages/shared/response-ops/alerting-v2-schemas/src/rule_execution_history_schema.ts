/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const RULE_EXECUTIONS_MAX_PER_PAGE = 100;
export const RULE_EXECUTIONS_DEFAULT_PER_PAGE = 20;
/**
 * Maximum number of events that can be paged through. Mirrors the default
 * Elasticsearch `index.max_result_window` so deep pagination via `from +
 * size` cannot blow up at the cluster boundary. Future work can switch to
 * `search_after` to remove the cap.
 */
export const RULE_EXECUTIONS_MAX_RESULT_WINDOW = 10_000;

/**
 * Coarse ECS-aligned outcome (`event.outcome`) for a single rule execution.
 *
 * Kept narrow on purpose. The fine-grained product taxonomy
 * (`success | warning | failed | timeout | skipped`) sourced from
 * `kibana.alerting_v2.rule_executor.execution.status` will land later as
 * a separate field so cross-platform ECS consumers stay unaffected.
 */
export const ruleExecutionOutcomeSchema = z.enum(['success', 'failure']);
export type RuleExecutionOutcome = z.infer<typeof ruleExecutionOutcomeSchema>;

/**
 * Accepts a single string or an array. Coerced to an array of outcome values.
 *
 * HTTP query strings can deliver `outcome` either as a single string
 * (`?outcome=success`) or as a repeated key (`?outcome=success&outcome=failure`).
 * The transform normalises both shapes; the trailing `.pipe(...)` re-validates
 * the result against the same enum so the inferred type is the array form.
 *
 * The `max(...)` cap tracks the enum size so a caller can list each value at
 * most once. It auto-extends when new outcome values are added.
 */
const RULE_EXECUTION_OUTCOMES_MAX = ruleExecutionOutcomeSchema.options.length;

const outcomeArraySchema = z
  .union([
    ruleExecutionOutcomeSchema,
    z.array(ruleExecutionOutcomeSchema).min(1).max(RULE_EXECUTION_OUTCOMES_MAX),
  ])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  .pipe(z.array(ruleExecutionOutcomeSchema).min(1).max(RULE_EXECUTION_OUTCOMES_MAX));

export const getRuleExecutionsQuerySchema = z
  .object({
    ruleId: z.string().min(1).max(256).optional().describe('Optional rule id to filter on.'),
    outcome: outcomeArraySchema
      .optional()
      .describe('Outcome filter. Pass one or more of success | failure.'),
    from: z.iso
      .datetime()
      .optional()
      .describe('Inclusive ISO datetime lower bound on event.start.'),
    to: z.iso.datetime().optional().describe('Inclusive ISO datetime upper bound on event.start.'),
    sort: z
      .enum(['startedAt', 'duration'])
      .default('startedAt')
      .describe('Sort field. Defaults to startedAt.'),
    sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort direction.'),
    page: z.coerce
      .number()
      .int()
      .min(1)
      .max(RULE_EXECUTIONS_MAX_RESULT_WINDOW)
      .default(1)
      .describe(`Page number.`),
    perPage: z.coerce
      .number()
      .int()
      .min(1)
      .max(RULE_EXECUTIONS_MAX_PER_PAGE)
      .default(RULE_EXECUTIONS_DEFAULT_PER_PAGE)
      .describe(`Number of results per page.`),
  })
  .refine(({ page, perPage }) => page * perPage <= RULE_EXECUTIONS_MAX_RESULT_WINDOW, {
    message: `page * perPage cannot exceed ${RULE_EXECUTIONS_MAX_RESULT_WINDOW}.`,
    path: ['page'],
  });
export type GetRuleExecutionsQuery = z.infer<typeof getRuleExecutionsQuerySchema>;

/**
 * Response shape for a single rule execution row.
 *
 *   - `rule.id` is parsed from the source `kibana.task.id`; `rule.name`
 *     is the best-effort display name (null when the rule was deleted or
 *     the rule SO lookup failed).
 *   - `startedAt` / `endedAt` are ISO instants; `timings.*` are millisecond
 *     metrics. The two concerns are kept separate so callers reading
 *     "when did it run?" don't have to read "how long did it take?".
 *   - `error` is `null` for runs with no recorded failure info — both the
 *     happy-path and failures Task Manager could not classify.
 */
export const ruleExecutionViewSchema = z.object({
  id: z.string(),
  rule: z.object({
    id: z.string(),
    name: z.string().nullable(),
  }),
  spaceId: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  timings: z.object({
    duration: z.number().int().nonnegative(),
    scheduledDelay: z.number().int(),
  }),
  outcome: ruleExecutionOutcomeSchema,
  reason: z.string().nullable(),
  error: z
    .object({
      message: z.string(),
      stackTrace: z.string().nullable(),
    })
    .nullable(),
});

export type RuleExecutionView = z.infer<typeof ruleExecutionViewSchema>;

export const getRuleExecutionsResponseSchema = z.object({
  items: z.array(ruleExecutionViewSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  perPage: z.number().int().min(1),
});

export type GetRuleExecutionsResponse = z.infer<typeof getRuleExecutionsResponseSchema>;
