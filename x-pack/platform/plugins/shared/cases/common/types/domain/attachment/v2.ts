/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { jsonValueSchema } from '../../../schema';
import {
  SECURITY_EVENT_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE,
  STACK_ALERT_ATTACHMENT_TYPE,
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
export const UnifiedReferenceAttachmentPayloadSchema = z.object({
  type: z.string(),
  attachmentId: z.union([z.string(), z.array(z.string())]),
  owner: z.string(),
  data: z.record(z.string(), jsonValueSchema).nullable().optional(),
  metadata: z.record(z.string(), jsonValueSchema).nullable().optional(),
});

/**
 * Payload for Value-based Attachments
 * - type: always required
 * - data: required - contains content/state (user comments, persistable state, visualizations)
 * - metadata: optional - additional metadata
 */
export const UnifiedValueAttachmentPayloadSchema = z.object({
  type: z.string(),
  data: z.record(z.string(), jsonValueSchema),
  owner: z.string(),
  metadata: z.record(z.string(), jsonValueSchema).nullable().optional(),
});

export const UnifiedAttachmentPayloadSchema = z.union([
  UnifiedReferenceAttachmentPayloadSchema,
  UnifiedValueAttachmentPayloadSchema,
]);

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
 * Partial payload props for patch (reference and value). We define these explicitly because
 * UnifiedReferenceAttachmentPayloadRt and UnifiedValueAttachmentPayloadRt are rt.intersection([...]),
 * so they have no .type.props (only rt.strict() codecs have .props); v1 payloads use rt.strict()
 * so AttachmentPatchAttributesRt can use .type.props there.
 */
const UnifiedReferenceAttachmentPayloadPartialSchema = z.object({
  type: z.string().optional(),
  attachmentId: z.union([z.string(), z.array(z.string())]).optional(),
  data: z.record(z.string(), jsonValueSchema).nullable().optional(),
  metadata: z.record(z.string(), jsonValueSchema).nullable().optional(),
});

const UnifiedValueAttachmentPayloadPartialSchema = z.object({
  type: z.string().optional(),
  data: z.record(z.string(), jsonValueSchema).optional(),
  metadata: z.record(z.string(), jsonValueSchema).nullable().optional(),
});

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
export const AttachmentSchemaV2 = z.union([AttachmentSchema, UnifiedAttachmentSchema]);
export const AttachmentsSchemaV2 = z.array(AttachmentSchemaV2);
export const AttachmentAttributesSchemaV2 = z.union([
  AttachmentAttributesSchema,
  UnifiedAttachmentAttributesSchema,
]);
export const AttachmentPatchAttributesSchemaV2 = z.union([
  AttachmentPatchAttributesSchema,
  UnifiedAttachmentPatchAttributesSchema,
]);

const UnifiedDocumentAttachmentMetadataSchema = z
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
  .optional();

const UnifiedDocumentAttachmentPayloadSchema = z
  .object({
    type: z.union([
      z.literal(SECURITY_EVENT_ATTACHMENT_TYPE),
      z.literal(SECURITY_ALERT_ATTACHMENT_TYPE),
      z.literal(OBSERVABILITY_ALERT_ATTACHMENT_TYPE),
      z.literal(STACK_ALERT_ATTACHMENT_TYPE),
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

export const DocumentAttachmentAttributesSchemaV2 = z.union([
  AlertAttachmentAttributesSchema,
  EventAttachmentAttributesSchema,
  UnifiedDocumentAttachmentAttributesSchema,
]);

export type AttachmentV2 = z.infer<typeof AttachmentSchemaV2>;
export type AttachmentsV2 = z.infer<typeof AttachmentsSchemaV2>;
export type AttachmentAttributesV2 = z.infer<typeof AttachmentAttributesSchemaV2>;
export type AttachmentPatchAttributesV2 = z.infer<typeof AttachmentPatchAttributesSchemaV2>;
export type DocumentAttachmentAttributesV2 = z.infer<typeof DocumentAttachmentAttributesSchemaV2>;
/**
 * Transitional read-shape mode while v1/v2 attachments coexist.
 */
export type AttachmentMode = 'legacy' | 'unified';
