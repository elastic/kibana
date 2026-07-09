/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../../constants/attachments';

/**
 * Shared metadata shape for alert attachments (stack / security / observability).
 * `index` may be a scalar or array because legacy alert payloads supported both,
 * and `rule` is optional/null for cross-tenant or rule-less alerts.
 */
export const AlertAttachmentMetadataSchema = z
  .object({
    index: z.union([z.string(), z.array(z.string())]).optional(),
    rule: z
      .union([
        z.null(),
        z
          .object({
            id: z.string().nullable().optional(),
            name: z.string().nullable().optional(),
          })
          .strict(),
      ])
      .optional(),
  })
  .strict();

export type AlertAttachmentMetadata = z.infer<typeof AlertAttachmentMetadataSchema>;

/**
 * Build a full-payload schema for a specific alert subtype. Each consumer
 * (`stack.alert`, `security.alert`, `observability.alert`) wires its own
 * `type` literal so unknown subtypes are rejected at registration time.
 *
 * `metadata` is `.optional()` rather than `nullable` so the inferred type stays
 * `Metadata | undefined`; the renderer doesn't need to discriminate `null` vs
 * `undefined`, and real writers never persist `metadata: null` for alerts.
 */
export const buildAlertAttachmentPayloadSchema = <T extends string>(typeLiteral: T) =>
  z
    .object({
      type: z.literal(typeLiteral),
      owner: z.string(),
      attachmentId: z.union([z.string(), z.array(z.string())]),
      metadata: AlertAttachmentMetadataSchema.optional(),
    })
    .strict();

export const StackAlertAttachmentPayloadSchema = buildAlertAttachmentPayloadSchema(
  STACK_ALERT_ATTACHMENT_TYPE
);

export type StackAlertAttachmentPayload = z.infer<typeof StackAlertAttachmentPayloadSchema>;
