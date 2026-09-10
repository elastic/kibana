/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { actionPolicyResponseSchema } from './action_policy_response_schema';

/** Namespaced to match `ALERTING_NAMESPACE` in `@kbn/alerting-v2-constants`. */
export const ACTION_POLICY_ATTACHMENT_TYPE = 'platform.alerting.action_policy' as const;

/**
 * Data stored inside an action policy attachment.
 *
 * Picks only the fields meaningful inside the attachment:
 *  - User-editable policy attributes (mirrors createActionPolicyData)
 *  - Minimal server-managed fields the attachment actually consumes:
 *      id           — identity for saved policies
 *      version      — optimistic concurrency on canvas updates
 *      enabled      — status badge in formatActionPolicyDescription
 *      snoozed_until — display
 *      updated_at    — staleness check against origin_snapshot_at
 *
 * All fields are optional so the same schema covers both:
 *  - proposed policies (by-value, built incrementally by manage_action_policy)
 *  - saved policies    (by-reference, snapshotted from the API response)
 *
 * Audit/identity metadata (auth, created_by*, updated_by*, created_at) is
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
    group_by: true,
    tags: true,
    grouping_mode: true,
    throttle: true,
    enabled: true,
    snoozed_until: true,
    updated_at: true,
  })
  .partial();

export type ActionPolicyAttachmentData = z.infer<typeof actionPolicyAttachmentDataSchema>;
