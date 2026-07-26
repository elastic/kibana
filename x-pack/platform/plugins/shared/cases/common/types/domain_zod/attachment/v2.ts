/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { jsonValueSchema } from '../../../schema_zod';
import {
  AttachmentAttributesBasicSchema,
  AttachmentAttributesSchema,
  AttachmentSchema,
} from './v1';

export const UnifiedReferenceAttachmentPayloadSchema = z.object({
  type: z.string(),
  attachmentId: z.string(),
  owner: z.string(),
  data: z.record(z.string(), jsonValueSchema).nullable().optional(),
  metadata: z.record(z.string(), jsonValueSchema).nullable().optional(),
});

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

export const UnifiedAttachmentAttributesSchema = UnifiedAttachmentPayloadSchema.and(
  AttachmentAttributesBasicSchema
);

export const UnifiedAttachmentSchema = UnifiedAttachmentAttributesSchema.and(
  z.object({ id: z.string(), version: z.string() })
);

const UnifiedReferenceAttachmentPayloadPartialSchema = z.object({
  type: z.string().optional(),
  attachmentId: z.string().optional(),
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
export const AttachmentAttributesSchemaV2 = z.union([
  AttachmentAttributesSchema,
  UnifiedAttachmentAttributesSchema,
]);

export type AttachmentV2 = z.infer<typeof AttachmentSchemaV2>;
export type AttachmentAttributesV2 = z.infer<typeof AttachmentAttributesSchemaV2>;
