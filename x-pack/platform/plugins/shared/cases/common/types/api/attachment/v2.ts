/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_ATTACHMENT_JSON_DEPTH,
  MAX_ATTACHMENT_JSON_LENGTH,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_BULK_GET_ATTACHMENTS,
  MAX_COMMENTS_PER_PAGE,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_ATTACHMENT_TYPES_PER_QUERY,
} from '../../../constants';
import { UnifiedAttachmentRt, UnifiedAttachmentPayloadRt } from '../../domain/attachment/v2';
import { limitedArraySchema, limitedStringSchema, paginationSchema } from '../../../schema';

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

export const BulkCreateUnifiedAttachmentsRequestRt = limitedArraySchema({
  codec: UnifiedAttachmentPayloadRt,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

const AttachmentTypeStringRt = limitedStringSchema({
  fieldName: 'type',
  min: 1,
  max: MAX_ATTACHMENT_TYPE_LENGTH,
});
const AttachmentTypeQueryParamRt = rt.union([
  AttachmentTypeStringRt,
  limitedArraySchema({
    codec: AttachmentTypeStringRt,
    min: 1,
    max: MAX_ATTACHMENT_TYPES_PER_QUERY,
    fieldName: 'type',
  }),
]);

export const UnifiedAttachmentsFindQueryParamsRt = rt.intersection([
  rt.exact(
    rt.partial({
      sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
      type: AttachmentTypeQueryParamRt,
    })
  ),
  paginationSchema({ maxPerPage: MAX_COMMENTS_PER_PAGE }),
]);

export const UnifiedAttachmentsFindResponseRt = rt.strict({
  data: rt.array(UnifiedAttachmentRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});
export type UnifiedAttachmentPutRequest = rt.TypeOf<typeof UnifiedAttachmentPutRequestRt>;

export const BulkGetUnifiedAttachmentsRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: rt.string,
    min: 1,
    max: MAX_BULK_GET_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export const BulkGetAttachmentErrorsRt = rt.array(
  rt.strict({
    error: rt.string,
    message: rt.string,
    status: rt.union([rt.undefined, rt.number]),
    savedObjectId: rt.string,
  })
);

export const BulkGetUnifiedAttachmentsResponseRt = rt.strict({
  attachments: rt.array(UnifiedAttachmentRt),
  errors: BulkGetAttachmentErrorsRt,
});

export type BulkCreateUnifiedAttachmentsRequest = rt.TypeOf<
  typeof BulkCreateUnifiedAttachmentsRequestRt
>;
export type UnifiedAttachmentsFindQueryParams = rt.TypeOf<
  typeof UnifiedAttachmentsFindQueryParamsRt
>;
export type UnifiedAttachmentsFindResponse = rt.TypeOf<typeof UnifiedAttachmentsFindResponseRt>;

export type BulkGetUnifiedAttachmentsRequest = rt.TypeOf<typeof BulkGetUnifiedAttachmentsRequestRt>;
export type BulkGetUnifiedAttachmentsResponse = rt.TypeOf<
  typeof BulkGetUnifiedAttachmentsResponseRt
>;
