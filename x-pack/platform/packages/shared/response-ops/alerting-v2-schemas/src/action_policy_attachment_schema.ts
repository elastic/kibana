/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { actionPolicyResponseSchema } from './action_policy_response_schema';

export const ACTION_POLICY_ATTACHMENT_TYPE = 'action_policy' as const;
export const ACTION_POLICY_SML_TYPE = 'alerting_v2_action_policy' as const;

/**
 * Data stored inside an action policy attachment.
 *
 * Picks only the fields meaningful inside the attachment:
 *  - User-editable policy attributes (mirrors createActionPolicyData)
 *  - Minimal server-managed fields the attachment actually consumes:
 *      id           — identity for saved policies
 *      version      — optimistic concurrency on canvas updates
 *      enabled      — status badge in formatActionPolicyDescription
 *      snoozedUntil — display
 *      updatedAt    — staleness check against origin_snapshot_at
 *
 * All fields are optional so the same schema covers both:
 *  - proposed policies (by-value, built incrementally by manage_action_policy)
 *  - saved policies    (by-reference, snapshotted from the API response)
 *
 * Audit/identity metadata (auth, createdBy*, updatedBy*, createdAt) is
 * intentionally excluded — nothing on the attachment side reads it, and we
 * don't want per-user identity baked into a conversation attachment.
 */
export const actionPolicyAttachmentDataSchema = actionPolicyResponseSchema
  .pick({
    id: true,
    version: true,
    name: true,
    description: true,
    destinations: true,
    matcher: true,
    groupBy: true,
    tags: true,
    groupingMode: true,
    throttle: true,
    enabled: true,
    snoozedUntil: true,
    updatedAt: true,
  })
  .partial();

export type ActionPolicyAttachmentData = z.infer<typeof actionPolicyAttachmentDataSchema>;
