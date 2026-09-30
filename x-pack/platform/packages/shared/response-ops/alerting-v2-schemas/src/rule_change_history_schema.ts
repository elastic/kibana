/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ESTIMATED_COUNT_NOTE, queryIntSchema } from './common';
import {
  ID_MAX_LENGTH,
  RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE,
  RULE_CHANGE_HISTORY_MAX_PER_PAGE,
  RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW,
} from './constants';
import { ruleIdSchema, type RuleResponse } from './rule_data_schema';

/**
 * Query params for `GET …/change_history/rules`.
 *
 * `rule_id` is singular because each row's diff is computed against its
 * predecessor in the same rule's stream; interleaving rules would diff
 * unrelated configurations.
 *
 * Pagination mirrors execution-history: 1-based `page`, bounded `per_page`,
 * and a max result window guard so callers cannot page arbitrarily deep.
 */
export const listRuleChangeHistoryRequestSchema = z
  .object({
    rule_id: ruleIdSchema,
    page: queryIntSchema({ min: 1, max: RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW })
      .default(1)
      .describe('Page number (1-based).'),
    per_page: queryIntSchema({ min: 1, max: RULE_CHANGE_HISTORY_MAX_PER_PAGE })
      .default(RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE)
      .describe('Number of results per page.'),
  })
  .strict()
  .refine(({ page, per_page }) => page * per_page <= RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW, {
    message: `page * per_page cannot exceed ${RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW}.`,
    path: ['page'],
  });

export type ListRuleChangeHistoryRequest = z.infer<typeof listRuleChangeHistoryRequestSchema>;

/** Path params for `GET …/change_history/rules/{change_id}`. */
export const getRuleChangeHistoryEventParamsSchema = z
  .object({
    change_id: z
      .string()
      .min(1)
      .max(ID_MAX_LENGTH)
      .describe('The change-history event identifier.'),
  })
  .strict();
export type GetRuleChangeHistoryEventParams = z.infer<typeof getRuleChangeHistoryEventParamsSchema>;

/**
 * Query params for `GET …/change_history/rules/{change_id}`.
 *
 * `change_id` alone identifies the event; `rule_id` is here only because the
 * one read API `@kbn/change-history` exposes always filters on an object id.
 * Tracked for removal in https://github.com/elastic/kibana/issues/292882.
 */
export const getRuleChangeHistoryEventQuerySchema = z.object({ rule_id: ruleIdSchema }).strict();
export type GetRuleChangeHistoryEventQuery = z.infer<typeof getRuleChangeHistoryEventQuerySchema>;

/**
 * Actor for a change-history row. Unattributed writes may carry an empty
 * `name` (the write path stores `username ?? ''`).
 */
export const ruleChangeHistoryActorSchema = z.object({
  name: z.string(),
  profile_id: z.string().optional(),
});
export type RuleChangeHistoryActor = z.infer<typeof ruleChangeHistoryActorSchema>;

/**
 * Rule lifecycle actions recorded by the change-history write path. `unknown`
 * is the read fallback for a document written by a newer version: the row is
 * still returned so the audit trail stays complete.
 */
export const ruleChangeHistoryActionSchema = z.enum([
  'rule_create',
  'rule_update',
  'rule_delete',
  'rule_enable',
  'rule_disable',
  'unknown',
]);
export type RuleChangeHistoryAction = z.infer<typeof ruleChangeHistoryActionSchema>;

/**
 * Server-computed diff vs the chronologically older version. `summary` is an
 * RFC 7396 JSON Merge Patch of previous values (opaque to the UI package).
 */
export const ruleChangeHistoryChangesSchema = z.object({
  count: z.number().int().nonnegative(),
  summary: z.record(z.string(), z.unknown()).optional(),
});
export type RuleChangeHistoryChanges = z.infer<typeof ruleChangeHistoryChangesSchema>;

/**
 * List row DTO.
 * Intentionally omits the full rule snapshot; that lives on the detail response.
 */
export const ruleChangeHistoryListItemSchema = z.object({
  id: z.string(),
  created_at: z.iso
    .datetime()
    .describe(
      'The ISO datetime when this change-history record was written. The rule change itself is timestamped by `updated_at` on the snapshot.'
    ),
  actor: ruleChangeHistoryActorSchema,
  action: ruleChangeHistoryActionSchema,
  changes: ruleChangeHistoryChangesSchema.optional(),
  comment: z.string().optional(),
  is_current: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  version: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('The rule version this change produced.'),
});
export type RuleChangeHistoryListItem = z.infer<typeof ruleChangeHistoryListItemSchema>;

export const listRuleChangeHistoryResponseSchema = z.object({
  items: z.array(ruleChangeHistoryListItemSchema),
  total: z
    .number()
    .int()
    .nonnegative()
    .describe(`The number of change events matching the query. ${ESTIMATED_COUNT_NOTE}`),
});
export type ListRuleChangeHistoryResponse = z.infer<typeof listRuleChangeHistoryResponseSchema>;

/**
 * Rule configuration snapshot at the time of the change.
 *
 * Runtime validation is intentionally permissive (`z.record`) so older
 * snapshots that predate schema changes do not fail response validation in
 * development. The TypeScript type is narrowed to the write-path snapshot
 * shape for autocomplete. Same rationale as alerting v1 `get_rule_history`.
 */
export type RuleChangeHistorySnapshot = Omit<RuleResponse, 'version'>;

const ruleChangeHistorySnapshotSchema = z.record(z.string(), z.unknown()) as z.ZodType<
  RuleChangeHistorySnapshot | Record<string, unknown>
>;

/**
 * Detail DTO
 */
export const ruleChangeHistoryDetailSchema = ruleChangeHistoryListItemSchema.extend({
  reason: z.string().optional(),
  snapshot: ruleChangeHistorySnapshotSchema,
});
export type RuleChangeHistoryDetail = Omit<
  z.infer<typeof ruleChangeHistoryDetailSchema>,
  'snapshot'
> & {
  snapshot: RuleChangeHistorySnapshot | Record<string, unknown>;
};
