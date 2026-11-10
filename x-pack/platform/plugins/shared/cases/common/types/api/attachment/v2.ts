/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_ATTACHMENT_JSON_DEPTH,
  MAX_ATTACHMENT_JSON_LENGTH,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_BULK_GET_ATTACHMENTS,
  MAX_COMMENTS_PER_PAGE,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_ATTACHMENT_TYPES_PER_QUERY,
  MAX_IDS_PER_ATTACHMENT,
  MAX_OWNER_LENGTH,
  MAX_SAVED_OBJECT_VERSION_LENGTH,
} from '../../../constants';
import {
  UnifiedAttachmentPayloadSchema,
  UnifiedAttachmentSchema,
  UnifiedReferenceAttachmentPayloadSchema,
  UnifiedValueAttachmentPayloadSchema,
} from '../../domain/attachment/v2';
import {
  limitedArraySchema,
  limitedJsonObjectSchema,
  limitedStringSchema,
  paginationSchema,
} from '../../../schema';

export const UnifiedAttachmentPutRequestSchema = z.union([
  UnifiedReferenceAttachmentPayloadSchema.extend({ version: z.string().max(512) }),
  UnifiedValueAttachmentPayloadSchema.extend({ version: z.string().max(512) }),
]);

const attachmentTypeSchema = z.string().max(MAX_ATTACHMENT_TYPE_LENGTH);
const attachmentOwnerSchema = z.string().max(MAX_OWNER_LENGTH);
const attachmentIdSchema = z.union([
  z.string().max(MAX_ATTACHMENT_ID_LENGTH),
  z.array(z.string().max(MAX_ATTACHMENT_ID_LENGTH)).max(MAX_IDS_PER_ATTACHMENT),
]);
const attachmentDataSchema = limitedJsonObjectSchema({
  fieldName: 'data',
  max: MAX_ATTACHMENT_JSON_LENGTH,
  maxDepth: MAX_ATTACHMENT_JSON_DEPTH,
});
const attachmentMetadataSchema = limitedJsonObjectSchema({
  fieldName: 'metadata',
  max: MAX_ATTACHMENT_JSON_LENGTH,
  maxDepth: MAX_ATTACHMENT_JSON_DEPTH,
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

export const UnifiedAttachmentPatchRouteRequestSchema = z.union([
  z
    .object({
      ...unifiedReferenceAttachmentRouteRequestShape,
      ...versionShape,
      id: z.string().max(MAX_ATTACHMENT_ID_LENGTH),
    })
    .strict(),
  z
    .object({
      ...unifiedValueAttachmentRouteRequestShape,
      ...versionShape,
      id: z.string().max(MAX_ATTACHMENT_ID_LENGTH),
    })
    .strict(),
]);

export const BulkCreateUnifiedAttachmentsRequestSchema = limitedArraySchema({
  codec: UnifiedAttachmentPayloadSchema,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

/**
 * Bounded variant of the bulk create body, built from the strict per-attachment route schema.
 */
export const BulkCreateUnifiedAttachmentsRouteRequestSchema = limitedArraySchema({
  codec: UnifiedAttachmentRouteRequestSchema,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export const BulkGetUnifiedAttachmentsRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: z.string().max(512),
    min: 1,
    max: MAX_BULK_GET_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export const BulkGetAttachmentErrorsSchema = z.array(
  z.object({
    error: z.string().max(32000),
    message: z.string().max(32000),
    status: z.number().optional(),
    savedObjectId: z.string().max(512),
  })
);

export const BulkGetUnifiedAttachmentsResponseSchema = z.object({
  attachments: z.array(UnifiedAttachmentSchema),
  errors: BulkGetAttachmentErrorsSchema,
});

const AttachmentTypeStringSchema = limitedStringSchema({
  fieldName: 'type',
  min: 1,
  max: MAX_ATTACHMENT_TYPE_LENGTH,
});
const AttachmentTypeQueryParamSchema = z.union([
  AttachmentTypeStringSchema,
  limitedArraySchema({
    codec: AttachmentTypeStringSchema,
    min: 1,
    max: MAX_ATTACHMENT_TYPES_PER_QUERY,
    fieldName: 'type',
  }),
]);

export const UnifiedAttachmentsFindQueryParamsSchema = paginationSchema({
  maxPerPage: MAX_COMMENTS_PER_PAGE,
}).extend({
  sortOrder: z.enum(['desc', 'asc']).optional(),
  type: AttachmentTypeQueryParamSchema.optional(),
});

export const UnifiedAttachmentsFindResponseSchema = z.object({
  data: z.array(UnifiedAttachmentSchema),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

export type UnifiedAttachmentRouteRequest = z.infer<typeof UnifiedAttachmentRouteRequestSchema>;
export type UnifiedAttachmentPutRouteRequest = z.infer<
  typeof UnifiedAttachmentPutRouteRequestSchema
>;
export type UnifiedAttachmentPutRequest = z.infer<typeof UnifiedAttachmentPutRequestSchema>;
export type BulkCreateUnifiedAttachmentsRequest = z.infer<
  typeof BulkCreateUnifiedAttachmentsRequestSchema
>;
export type BulkCreateUnifiedAttachmentsRouteRequest = z.infer<
  typeof BulkCreateUnifiedAttachmentsRouteRequestSchema
>;
export type UnifiedAttachmentsFindQueryParams = z.infer<
  typeof UnifiedAttachmentsFindQueryParamsSchema
>;
export type UnifiedAttachmentsFindResponse = z.infer<typeof UnifiedAttachmentsFindResponseSchema>;
export type BulkGetUnifiedAttachmentsRequest = z.infer<
  typeof BulkGetUnifiedAttachmentsRequestSchema
>;
export type BulkGetUnifiedAttachmentsResponse = z.infer<
  typeof BulkGetUnifiedAttachmentsResponseSchema
>;
