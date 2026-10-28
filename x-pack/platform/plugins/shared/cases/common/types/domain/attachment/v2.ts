/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { jsonValueSchema } from '../../../schema';
import {
  SECURITY_EVENT_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
  SECURITY_ENTITY_ATTACHMENT_TYPE,
} from '../../../constants/attachments';
import {
  AlertAttachmentAttributesSchema,
  AttachmentAttributesBasicSchema,
  AttachmentAttributesSchema,
  AttachmentPatchAttributesSchema,
  AttachmentSchema,
  EventAttachmentAttributesSchema,
} from './v1';

/**
 * Payload for Reference-based Attachments
 * - type: always required
 * - attachmentId: required - references external entities (alerts, events, external references)
 * - metadata: optional - additional metadata about the reference
 * - data: optional - some reference attachments may also have data
 */
export const UnifiedReferenceAttachmentPayloadSchema = lazySchema(() =>
  z.object({
    type: z.string(),
    attachmentId: z.union([z.string(), z.array(z.string())]),
    owner: z.string(),
    data: z.record(z.string(), jsonValueSchema).nullable().optional(),
    metadata: z.record(z.string(), jsonValueSchema).nullable().optional(),
  })
);

/**
 * Payload for Value-based Attachments
 * - type: always required
 * - data: required - contains content/state (user comments, persistable state, visualizations)
 * - metadata: optional - additional metadata
 */
export const UnifiedValueAttachmentPayloadSchema = lazySchema(() =>
  z.object({
    type: z.string(),
    data: z.record(z.string(), jsonValueSchema),
    owner: z.string(),
    metadata: z.record(z.string(), jsonValueSchema).nullable().optional(),
  })
);

export const UnifiedAttachmentPayloadSchema = lazySchema(() =>
  z.union([UnifiedReferenceAttachmentPayloadSchema, UnifiedValueAttachmentPayloadSchema])
);

/**
 * Saved Object attributes for Unified Attachments
 * Contains the payload and the basic attributes
 */
export const UnifiedAttachmentAttributesSchema = UnifiedAttachmentPayloadSchema.and(
  AttachmentAttributesBasicSchema
);

/**
 * Full Saved Object representationfor Unified Attachments
 * Contains payload, basic attributes and id and version
 */
export const UnifiedAttachmentSchema = UnifiedAttachmentAttributesSchema.and(
  z.object({ id: z.string(), version: z.string() })
);

/**
 * Partial payload props for patch (reference and value). `owner` cannot be changed after creation.
 */
const UnifiedReferenceAttachmentPayloadPartialSchema = UnifiedReferenceAttachmentPayloadSchema.omit(
  { owner: true }
).partial();

const UnifiedValueAttachmentPayloadPartialSchema = UnifiedValueAttachmentPayloadSchema.omit({
  owner: true,
}).partial();

export const UnifiedAttachmentPatchAttributesSchema = z
  .union([
    UnifiedReferenceAttachmentPayloadPartialSchema,
    UnifiedValueAttachmentPayloadPartialSchema,
  ])
  .and(AttachmentAttributesBasicSchema.partial());

export type UnifiedReferenceAttachmentPayload = z.infer<
  typeof UnifiedReferenceAttachmentPayloadSchema
>;
export type UnifiedValueAttachmentPayload = z.infer<typeof UnifiedValueAttachmentPayloadSchema>;
export type UnifiedAttachmentPayload = z.infer<typeof UnifiedAttachmentPayloadSchema>;
export type UnifiedAttachmentAttributes = z.infer<typeof UnifiedAttachmentAttributesSchema>;
export type UnifiedAttachment = z.infer<typeof UnifiedAttachmentSchema>;

/**
 * Combined v1 legacy and v2 unified attachment types
 */
export const AttachmentSchemaV2 = lazySchema(() =>
  z.union([AttachmentSchema, UnifiedAttachmentSchema])
);
export const AttachmentsSchemaV2 = lazySchema(() => z.array(AttachmentSchemaV2));
export const AttachmentAttributesSchemaV2 = lazySchema(() =>
  z.union([AttachmentAttributesSchema, UnifiedAttachmentAttributesSchema])
);
export const AttachmentPatchAttributesSchemaV2 = lazySchema(() =>
  z.union([AttachmentPatchAttributesSchema, UnifiedAttachmentPatchAttributesSchema])
);

const UnifiedDocumentAttachmentMetadataSchema = lazySchema(() =>
  z
    .union([
      z.null(),
      z
        .object({
          index: z.union([z.string(), z.array(z.string())]),
          rule: z.union([
            z.null(),
            z.object({
              id: z.union([z.string(), z.null()]),
              name: z.union([z.string(), z.null()]),
            }),
          ]),
        })
        .partial(),
    ])
    .optional()
);

const UnifiedDocumentAttachmentPayloadSchema = z
  .object({
    type: z.union([
      z.literal(SECURITY_EVENT_ATTACHMENT_TYPE),
      z.literal(SECURITY_ALERT_ATTACHMENT_TYPE),
      z.literal(OBSERVABILITY_ALERT_ATTACHMENT_TYPE),
      z.literal(STACK_ALERT_ATTACHMENT_TYPE),
      z.literal(SECURITY_ENTITY_ATTACHMENT_TYPE),
    ]),
    attachmentId: z.union([z.string(), z.array(z.string())]),
    owner: z.string(),
  })
  .and(
    z
      .object({
        metadata: UnifiedDocumentAttachmentMetadataSchema,
      })
      .partial()
  );

const UnifiedDocumentAttachmentAttributesSchema = UnifiedDocumentAttachmentPayloadSchema.and(
  AttachmentAttributesBasicSchema
);

export const DocumentAttachmentAttributesSchemaV2 = lazySchema(() =>
  z.union([
    AlertAttachmentAttributesSchema,
    EventAttachmentAttributesSchema,
    UnifiedDocumentAttachmentAttributesSchema,
  ])
);

export type AttachmentV2 = z.infer<typeof AttachmentSchemaV2>;
export type AttachmentsV2 = z.infer<typeof AttachmentsSchemaV2>;
export type AttachmentAttributesV2 = z.infer<typeof AttachmentAttributesSchemaV2>;
export type AttachmentPatchAttributesV2 = z.infer<typeof AttachmentPatchAttributesSchemaV2>;
export type DocumentAttachmentAttributesV2 = z.infer<typeof DocumentAttachmentAttributesSchemaV2>;
