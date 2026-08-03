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
  EXECUTION_HISTORY_MAX_RESULT_WINDOW,
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER,
} from './constants';
import {
  dispatchFailureReasonSchema,
  namedRefSchema,
  MAX_EMBEDDED_RULES_PER_ITEM,
  MAX_EMBEDDED_EPISODES_PER_ITEM,
} from './policy_execution_history_schema';

export const DISPATCH_FAILURES_MAX_PER_PAGE = 100;
export const DISPATCH_FAILURES_DEFAULT_PER_PAGE = 20;

const idFilterArraySchema = arrayOrSingleSchema(
  z.string().trim().min(1).max(ID_MAX_LENGTH),
  EXECUTION_HISTORY_MAX_RULE_ID_FILTER
);

export const getDispatchFailuresRequestSchema = z
  .object({
    from: z.iso.datetime().optional(),
    to: z.iso.datetime().optional(),
    page: queryIntSchema({ min: 1, max: EXECUTION_HISTORY_MAX_RESULT_WINDOW }).optional(),
    per_page: queryIntSchema({ min: 0, max: DISPATCH_FAILURES_MAX_PER_PAGE }).optional(),
    rule_ids: idFilterArraySchema.optional(),
    policy_ids: idFilterArraySchema.optional(),
    workflow_ids: idFilterArraySchema.optional(),
    episode_ids: idFilterArraySchema.optional(),
    reason: arrayOrSingleSchema(
      dispatchFailureReasonSchema,
      dispatchFailureReasonSchema.options.length
    ).optional(),
  })
  .refine(
    ({ page = 1, per_page: perPage = DISPATCH_FAILURES_DEFAULT_PER_PAGE }) =>
      page * perPage <= EXECUTION_HISTORY_MAX_RESULT_WINDOW,
    {
      message: `page * per_page cannot exceed ${EXECUTION_HISTORY_MAX_RESULT_WINDOW}.`,
      path: ['page'],
    }
  );
export type GetDispatchFailuresRequest = z.infer<typeof getDispatchFailuresRequestSchema>;

const dispatchFailureEpisodeSchema = z.object({ id: z.string() });

export const dispatchFailureItemSchema = z.object({
  dispatched_at: z.string(),
  execution_uuid: z.string(),
  failure_reason: dispatchFailureReasonSchema,
  error: z.object({ message: z.string() }),
  policy: namedRefSchema,
  action_group: z.object({ id: z.string() }),
  workflow: namedRefSchema,
  episodes: z.array(dispatchFailureEpisodeSchema).max(MAX_EMBEDDED_EPISODES_PER_ITEM),
  episode_count: z.number().int().nonnegative(),
  rules: z.array(namedRefSchema).max(MAX_EMBEDDED_RULES_PER_ITEM),
  totalRuleCount: z.number().int().nonnegative(),
});
export type DispatchFailureItem = z.infer<typeof dispatchFailureItemSchema>;

export const getDispatchFailuresResponseSchema = z.object({
  items: z.array(dispatchFailureItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  perPage: z.number().int().min(0),
});
export type GetDispatchFailuresResponse = z.infer<typeof getDispatchFailuresResponseSchema>;
