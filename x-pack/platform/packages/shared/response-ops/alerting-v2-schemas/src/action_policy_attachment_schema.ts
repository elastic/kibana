/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { optionalWithDescription as opt } from './common';
import { actionPolicyResponseSchema } from './action_policy_response_schema';

export const ACTION_POLICY_ATTACHMENT_TYPE = 'action_policy' as const;
export const ACTION_POLICY_SML_TYPE = 'alerting_v2_action_policy' as const;

/**
 * Data stored inside an action policy attachment.
 *
 * Server-generated fields that are required in the API response (id, enabled,
 * auth, createdAt, updatedAt) are made optional so the same schema covers both:
 *   - proposed policies (by-value, not yet saved — no id or audit fields)
 *   - saved policies    (by-reference, linked via attachment.origin = policy saved object id)
 *
 * Fields that are nullable in the response schema but not optional (createdBy,
 * createdByUsername, updatedBy, updatedByUsername, snoozedUntil, description,
 * groupBy, tags, groupingMode, throttle) are also made optional so that a
 * proposed policy built incrementally by the manage_action_policy tool can omit
 * fields that haven't been set yet.
 */
const { shape } = actionPolicyResponseSchema;

export const actionPolicyAttachmentDataSchema = actionPolicyResponseSchema.extend({
  id: opt(shape.id),
  enabled: opt(shape.enabled),
  auth: opt(shape.auth),
  createdAt: opt(shape.createdAt),
  updatedAt: opt(shape.updatedAt),
  description: opt(shape.description),
  groupBy: opt(shape.groupBy),
  tags: opt(shape.tags),
  snoozedUntil: opt(shape.snoozedUntil),
  createdBy: opt(shape.createdBy),
  createdByUsername: opt(shape.createdByUsername),
  updatedBy: opt(shape.updatedBy),
  updatedByUsername: opt(shape.updatedByUsername),
  groupingMode: opt(shape.groupingMode),
  throttle: opt(shape.throttle),
  /** Maps destination IDs to resolved metadata for display (not persisted to API). */
  resolvedDestinations: z
    .record(z.string(), z.object({ name: z.string(), isDraft: z.boolean() }))
    .optional(),
});

export type ActionPolicyAttachmentData = z.infer<typeof actionPolicyAttachmentDataSchema>;
