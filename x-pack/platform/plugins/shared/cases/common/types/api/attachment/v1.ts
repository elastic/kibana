/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_COMMENTS_PER_PAGE,
  MAX_COMMENT_LENGTH,
  MAX_BULK_DELETE_ATTACHMENTS,
  MAX_DELETE_FILES,
  MAX_FILENAME_LENGTH,
  MAX_TITLE_LENGTH,
} from '../../../constants';
import {
  limitedArraySchema,
  limitedStringSchema,
  NonEmptyString,
  paginationSchema,
} from '../../../schema';
import {
  UserCommentAttachmentPayloadSchema,
  AlertAttachmentPayloadSchema,
  ActionsAttachmentPayloadSchema,
  ExternalReferenceNoSOAttachmentPayloadSchema,
  ExternalReferenceSOAttachmentPayloadSchema,
  ExternalReferenceSOWithoutRefsAttachmentPayloadSchema,
  PersistableStateAttachmentPayloadSchema,
  AttachmentType,
  AttachmentsSchema,
  EventAttachmentPayloadSchema,
} from '../../domain/attachment/v1';

export { AttachmentType };

/**
 * Files
 */

const MIN_DELETE_IDS = 1;

export const BulkDeleteFileAttachmentsRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_DELETE_FILES,
    fieldName: 'ids',
  }),
});

/**
 * Attachments bulk delete
 */

export const BulkDeleteAttachmentsRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_BULK_DELETE_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export const PostFileAttachmentRequestSchema = z.object({
  file: z.unknown(),
  filename: limitedStringSchema({
    fieldName: 'filename',
    min: 1,
    max: MAX_FILENAME_LENGTH,
  }).optional(),
});

/**
 * Attachments
 */

export const AttachmentRequestSchema = z.union([
  z.object({
    comment: limitedStringSchema({ fieldName: 'comment', min: 1, max: MAX_COMMENT_LENGTH }),
    type: z.literal(AttachmentType.user),
    owner: z.string().max(MAX_TITLE_LENGTH),
  }),
  EventAttachmentPayloadSchema,
  AlertAttachmentPayloadSchema,
  z.object({
    type: z.literal(AttachmentType.actions),
    comment: limitedStringSchema({ fieldName: 'comment', min: 1, max: MAX_COMMENT_LENGTH }),
    actions: z.object({
      targets: z.array(
        z.object({
          hostname: z.string().max(255),
          endpointId: z.string().max(512),
        })
      ),
      type: z.string().max(256),
    }),
    owner: z.string().max(MAX_TITLE_LENGTH),
  }),
  ExternalReferenceNoSOAttachmentPayloadSchema,
  ExternalReferenceSOAttachmentPayloadSchema,
  PersistableStateAttachmentPayloadSchema,
]);

export const AttachmentRequestWithoutRefsSchema = z.union([
  UserCommentAttachmentPayloadSchema,
  AlertAttachmentPayloadSchema,
  EventAttachmentPayloadSchema,
  ActionsAttachmentPayloadSchema,
  ExternalReferenceNoSOAttachmentPayloadSchema,
  ExternalReferenceSOWithoutRefsAttachmentPayloadSchema,
  PersistableStateAttachmentPayloadSchema,
]);

/**
 * Partial updates are not allowed.
 * We want to prevent the user for changing the type without removing invalid fields.
 * injectAttachmentSOAttributesFromRefsForPatch is dependent on this assumption.
 * The consumers of the persistable attachment service should always get the
 * persistableStateAttachmentState on a patch.
 */
export const AttachmentPatchRequestSchema = AttachmentRequestSchema.and(
  z.object({ id: z.string().max(512), version: z.string().max(512) })
);

export const AttachmentsFindResponseSchema = z.object({
  comments: AttachmentsSchema,
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

export const FindAttachmentsQueryParamsSchema = paginationSchema({
  maxPerPage: MAX_COMMENTS_PER_PAGE,
}).extend({
  /**
   * Order to sort the response
   */
  sortOrder: z.enum(['desc', 'asc']).optional(),
});

export type BulkDeleteAttachmentsRequest = z.infer<typeof BulkDeleteAttachmentsRequestSchema>;
export type BulkDeleteFileAttachmentsRequest = z.infer<
  typeof BulkDeleteFileAttachmentsRequestSchema
>;
export type PostFileAttachmentRequest = z.infer<typeof PostFileAttachmentRequestSchema>;
export type AttachmentRequest = z.infer<typeof AttachmentRequestSchema>;
export type AttachmentPatchRequest = z.infer<typeof AttachmentPatchRequestSchema>;
export type AttachmentsFindResponse = z.infer<typeof AttachmentsFindResponseSchema>;
export type FindAttachmentsQueryParams = z.infer<typeof FindAttachmentsQueryParamsSchema>;
