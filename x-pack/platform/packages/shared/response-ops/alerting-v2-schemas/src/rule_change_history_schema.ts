/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { queryIntSchema } from './common';
import {
  ID_MAX_LENGTH,
  RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE,
  RULE_CHANGE_HISTORY_MAX_PER_PAGE,
  RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW,
} from './constants';
import type { RuleResponse } from './rule_data_schema';

/**
 * Query params for `GET …/rules/{id}/history`.
 *
 * Pagination mirrors execution-history: 1-based `page`, bounded `per_page`,
 * and a max result window guard so callers cannot page arbitrarily deep.
 */
export const listRuleChangeHistoryRequestSchema = z
  .object({
    page: queryIntSchema({ min: 1, max: RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW })
      .default(1)
      .describe('Page number (1-based).'),
    per_page: queryIntSchema({ min: 1, max: RULE_CHANGE_HISTORY_MAX_PER_PAGE })
      .default(RULE_CHANGE_HISTORY_DEFAULT_PER_PAGE)
      .describe('Number of results per page.'),
  })
  .refine(({ page, per_page }) => page * per_page <= RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW, {
    message: `page * per_page cannot exceed ${RULE_CHANGE_HISTORY_MAX_RESULT_WINDOW}.`,
    path: ['page'],
  });
export type ListRuleChangeHistoryRequest = z.infer<typeof listRuleChangeHistoryRequestSchema>;

/** Path params for `GET …/rules/{id}/history/{eventId}`. */
export const getRuleChangeHistoryEventParamsSchema = z.object({
  id: z.string().min(1).max(ID_MAX_LENGTH).describe('The identifier for the rule.'),
  eventId: z
    .string()
    .min(1)
    .max(ID_MAX_LENGTH)
    .describe('The change-history event identifier (`event.id`).'),
});
export type GetRuleChangeHistoryEventParams = z.infer<typeof getRuleChangeHistoryEventParamsSchema>;

/**
 * Actor for a change-history row. Mirrors `@kbn/change-history-ui`
 * `ChangeHistoryListItem['actor']`. Unattributed writes may carry an empty
 * `name` (the write path stores `username ?? ''`).
 */
export const ruleChangeHistoryActorSchema = z.object({
  name: z.string(),
  profileId: z.string().optional(),
});
export type RuleChangeHistoryActor = z.infer<typeof ruleChangeHistoryActorSchema>;

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
 * List row DTO — structurally compatible with `@kbn/change-history-ui`
 * `ChangeHistoryListItem`. Intentionally omits the full rule snapshot; that
 * lives on the detail response.
 */
export const ruleChangeHistoryListItemSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: ruleChangeHistoryActorSchema,
  action: z.string(),
  changes: ruleChangeHistoryChangesSchema.optional(),
  comment: z.string().optional(),
  isCurrent: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RuleChangeHistoryListItem = z.infer<typeof ruleChangeHistoryListItemSchema>;

export const listRuleChangeHistoryResponseSchema = z.object({
  items: z.array(ruleChangeHistoryListItemSchema),
  total: z.number().int().nonnegative(),
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
 * Detail DTO — structurally compatible with `@kbn/change-history-ui`
 * `ChangeHistoryDetail`.
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
