/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazySchema, z } from '@kbn/zod/v4';
import {
  MAX_COMMENTS_PER_PAGE,
  MAX_COMMENT_LENGTH,
  MAX_BULK_DELETE_ATTACHMENTS,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_ATTACHMENT_JSON_DEPTH,
  MAX_ATTACHMENT_JSON_LENGTH,
  MAX_DELETE_FILES,
  MAX_FILENAME_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_ATTACHMENT_ID_LENGTH,
  MAX_INDEX_NAME_LENGTH,
} from '../../../constants';
import {
  limitedArraySchema,
  limitedJsonObjectSchema,
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
  ExternalReferenceStorageType,
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

export const BulkDeleteAttachmentsBySavedObjectIdRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_BULK_DELETE_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

/** Bulk delete by the ids that attachments of one type reference (alert ids, event ids, ...). */
export const BulkDeleteAttachmentsByAttachmentIdRequestSchema = lazySchema(() =>
  z.object({
    type: limitedStringSchema({ fieldName: 'type', min: 1, max: MAX_ATTACHMENT_TYPE_LENGTH }),
    attachmentIds: limitedArraySchema({
      codec: NonEmptyString,
      min: MIN_DELETE_IDS,
      max: MAX_BULK_DELETE_ATTACHMENTS,
      fieldName: 'attachmentIds',
    }),
  })
);

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

const stringOrArray = (max: number) => z.union([z.array(z.string().max(max)), z.string().max(max)]);

const BoundedUserCommentRequestSchema = UserCommentAttachmentPayloadSchema.extend({
  comment: limitedStringSchema({ fieldName: 'comment', min: 1, max: MAX_COMMENT_LENGTH }),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

const BoundedEventRequestSchema = EventAttachmentPayloadSchema.extend({
  eventId: stringOrArray(MAX_ATTACHMENT_ID_LENGTH),
  index: stringOrArray(MAX_INDEX_NAME_LENGTH),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

const BoundedAlertRequestSchema = AlertAttachmentPayloadSchema.extend({
  alertId: stringOrArray(MAX_ATTACHMENT_ID_LENGTH),
  index: stringOrArray(MAX_INDEX_NAME_LENGTH),
  rule: z.object({
    id: z.string().max(MAX_TITLE_LENGTH).nullable(),
    name: z.string().max(MAX_COMMENT_LENGTH).nullable(),
  }),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

const BoundedActionsRequestSchema = ActionsAttachmentPayloadSchema.extend({
  comment: limitedStringSchema({ fieldName: 'comment', min: 1, max: MAX_COMMENT_LENGTH }),
  actions: z.object({
    targets: z.array(
      z.object({
        hostname: z.string().max(255),
        endpointId: z.string().max(MAX_ATTACHMENT_ID_LENGTH),
      })
    ),
    type: z.string().max(256),
  }),
  owner: z.string().max(MAX_TITLE_LENGTH),
});

const boundedExternalReferenceShape = {
  externalReferenceAttachmentTypeId: z.string().max(MAX_TITLE_LENGTH),
  externalReferenceMetadata: limitedJsonObjectSchema({
    fieldName: 'externalReferenceMetadata',
    max: MAX_COMMENT_LENGTH,
    maxDepth: MAX_ATTACHMENT_JSON_DEPTH,
  }).nullable(),
  owner: z.string().max(MAX_TITLE_LENGTH),
};

const BoundedExternalReferenceNoSORequestSchema =
  ExternalReferenceNoSOAttachmentPayloadSchema.extend({
    ...boundedExternalReferenceShape,
    externalReferenceId: z.string().max(MAX_ATTACHMENT_ID_LENGTH),
  });

const boundedStorageSO = z.object({
  type: z.literal(ExternalReferenceStorageType.savedObject),
  soType: z.string().max(MAX_TITLE_LENGTH),
});

const BoundedExternalReferenceSORequestSchema = ExternalReferenceSOAttachmentPayloadSchema.extend({
  ...boundedExternalReferenceShape,
  externalReferenceId: z.string().max(MAX_ATTACHMENT_ID_LENGTH),
  externalReferenceStorage: boundedStorageSO,
});

const BoundedExternalReferenceSOWithoutRefsRequestSchema =
  ExternalReferenceSOWithoutRefsAttachmentPayloadSchema.extend({
    ...boundedExternalReferenceShape,
    externalReferenceStorage: boundedStorageSO,
  });

const BoundedPersistableStateRequestSchema = PersistableStateAttachmentPayloadSchema.extend({
  owner: z.string().max(MAX_TITLE_LENGTH),
  persistableStateAttachmentTypeId: z.string().max(MAX_TITLE_LENGTH),
  persistableStateAttachmentState: limitedJsonObjectSchema({
    fieldName: 'persistableStateAttachmentState',
    max: MAX_ATTACHMENT_JSON_LENGTH,
    maxDepth: MAX_ATTACHMENT_JSON_DEPTH,
  }),
});

export const AttachmentRequestSchema = z.union([
  BoundedUserCommentRequestSchema,
  BoundedEventRequestSchema,
  BoundedAlertRequestSchema,
  BoundedActionsRequestSchema,
  BoundedExternalReferenceNoSORequestSchema,
  BoundedExternalReferenceSORequestSchema,
  BoundedPersistableStateRequestSchema,
]);

export const AttachmentRequestWithoutRefsSchema = z.union([
  BoundedUserCommentRequestSchema,
  BoundedAlertRequestSchema,
  BoundedEventRequestSchema,
  BoundedActionsRequestSchema,
  BoundedExternalReferenceNoSORequestSchema,
  BoundedExternalReferenceSOWithoutRefsRequestSchema,
  BoundedPersistableStateRequestSchema,
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

export type BulkDeleteAttachmentsBySavedObjectIdRequest = z.infer<
  typeof BulkDeleteAttachmentsBySavedObjectIdRequestSchema
>;
export type BulkDeleteAttachmentsByAttachmentIdRequest = z.infer<
  typeof BulkDeleteAttachmentsByAttachmentIdRequestSchema
>;
export type BulkDeleteAttachmentsRequest =
  | BulkDeleteAttachmentsBySavedObjectIdRequest
  | BulkDeleteAttachmentsByAttachmentIdRequest;
export type BulkDeleteFileAttachmentsRequest = z.infer<
  typeof BulkDeleteFileAttachmentsRequestSchema
>;
export type PostFileAttachmentRequest = z.infer<typeof PostFileAttachmentRequestSchema>;
export type AttachmentRequest = z.infer<typeof AttachmentRequestSchema>;
export type AttachmentPatchRequest = z.infer<typeof AttachmentPatchRequestSchema>;
export type AttachmentsFindResponse = z.infer<typeof AttachmentsFindResponseSchema>;
export type FindAttachmentsQueryParams = z.infer<typeof FindAttachmentsQueryParamsSchema>;
