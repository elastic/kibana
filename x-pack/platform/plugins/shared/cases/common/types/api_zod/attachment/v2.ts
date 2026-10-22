/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_ATTACHMENT_JSON_LENGTH,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_BULK_GET_ATTACHMENTS,
  MAX_IDS_PER_ATTACHMENT,
  MAX_OWNER_LENGTH,
  MAX_SAVED_OBJECT_VERSION_LENGTH,
} from '../../../constants';
import { limitedArraySchema, limitedJsonObjectSchema } from '../../../schema_zod';
import {
  AttachmentRequestSchema,
  AttachmentRequestWithoutRefsSchema,
  AttachmentPatchRequestSchema,
} from './v1';
import {
  UnifiedAttachmentPayloadSchema,
  UnifiedAttachmentSchema,
} from '../../domain_zod/attachment/v2';

const attachmentTypeSchema = z.string().max(MAX_ATTACHMENT_TYPE_LENGTH);
const attachmentOwnerSchema = z.string().max(MAX_OWNER_LENGTH);
const attachmentIdSchema = z.union([
  z.string().max(MAX_ATTACHMENT_ID_LENGTH),
  z.array(z.string().max(MAX_ATTACHMENT_ID_LENGTH)).max(MAX_IDS_PER_ATTACHMENT),
]);
const attachmentDataSchema = limitedJsonObjectSchema({
  fieldName: 'data',
  max: MAX_ATTACHMENT_JSON_LENGTH,
});
const attachmentMetadataSchema = limitedJsonObjectSchema({
  fieldName: 'metadata',
  max: MAX_ATTACHMENT_JSON_LENGTH,
});

/**
 * Type-agnostic bounds checked on every unified attachment write, before its registered schema.
 */
export const UnifiedAttachmentBoundsSchema = z.object({
  type: attachmentTypeSchema,
  owner: attachmentOwnerSchema,
  attachmentId: attachmentIdSchema.optional(),
  data: attachmentDataSchema.nullable().optional(),
  metadata: attachmentMetadataSchema.nullable().optional(),
});

const unifiedReferenceAttachmentRouteRequestShape = {
  type: attachmentTypeSchema,
  attachmentId: attachmentIdSchema,
  owner: attachmentOwnerSchema,
  data: attachmentDataSchema.nullable().optional(),
  metadata: attachmentMetadataSchema.nullable().optional(),
};

const unifiedValueAttachmentRouteRequestShape = {
  type: attachmentTypeSchema,
  data: attachmentDataSchema,
  owner: attachmentOwnerSchema,
  metadata: attachmentMetadataSchema.nullable().optional(),
};

const versionShape = { version: z.string().max(MAX_SAVED_OBJECT_VERSION_LENGTH) };

/**
 * Bounded body for `POST /api/cases/{case_id}/attachments`.
 */
export const UnifiedAttachmentRouteRequestSchema = z.union([
  z.object(unifiedReferenceAttachmentRouteRequestShape).strict(),
  z.object(unifiedValueAttachmentRouteRequestShape).strict(),
]);

/**
 * Bounded body for `PUT /api/cases/{case_id}/attachments/{id}`.
 */
export const UnifiedAttachmentPutRouteRequestSchema = z.union([
  z.object({ ...unifiedReferenceAttachmentRouteRequestShape, ...versionShape }).strict(),
  z.object({ ...unifiedValueAttachmentRouteRequestShape, ...versionShape }).strict(),
]);

export const AttachmentRequestSchemaV2 = z.union([
  AttachmentRequestSchema,
  UnifiedAttachmentPayloadSchema,
]);

export const AttachmentRequestWithoutRefsSchemaV2 = z.union([
  AttachmentRequestWithoutRefsSchema,
  UnifiedAttachmentPayloadSchema,
]);

const idShape = { id: z.string().max(MAX_ATTACHMENT_ID_LENGTH) };

export const AttachmentPatchRequestSchemaV2 = z.union([
  AttachmentPatchRequestSchema,
  z
    .object({ ...unifiedReferenceAttachmentRouteRequestShape, ...versionShape, ...idShape })
    .strict(),
  z.object({ ...unifiedValueAttachmentRouteRequestShape, ...versionShape, ...idShape }).strict(),
]);

export const BulkCreateUnifiedAttachmentsRequestSchema = limitedArraySchema({
  codec: UnifiedAttachmentRouteRequestSchema,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export const BulkGetUnifiedAttachmentsRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: z.string(),
    min: 1,
    max: MAX_BULK_GET_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export const BulkGetAttachmentErrorsSchema = z.array(
  z.object({
    error: z.string(),
    message: z.string(),
    status: z.number().optional(),
    savedObjectId: z.string(),
  })
);

export const BulkGetUnifiedAttachmentsResponseSchema = z.object({
  attachments: z.array(UnifiedAttachmentSchema),
  errors: BulkGetAttachmentErrorsSchema,
});

export type UnifiedAttachmentRouteRequest = z.infer<typeof UnifiedAttachmentRouteRequestSchema>;
export type UnifiedAttachmentPutRouteRequest = z.infer<
  typeof UnifiedAttachmentPutRouteRequestSchema
>;
export type AttachmentRequestV2 = z.infer<typeof AttachmentRequestSchemaV2>;
export type AttachmentPatchRequestV2 = z.infer<typeof AttachmentPatchRequestSchemaV2>;
export type BulkCreateUnifiedAttachmentsRequest = z.infer<
  typeof BulkCreateUnifiedAttachmentsRequestSchema
>;
export type BulkGetUnifiedAttachmentsRequest = z.infer<
  typeof BulkGetUnifiedAttachmentsRequestSchema
>;
export type BulkGetUnifiedAttachmentsResponse = z.infer<
  typeof BulkGetUnifiedAttachmentsResponseSchema
>;
