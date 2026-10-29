/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_COMMENTS_PER_PAGE,
  MAX_COMMENT_LENGTH,
  MAX_BULK_DELETE_ATTACHMENTS,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_ATTACHMENT_JSON_DEPTH,
  MAX_ATTACHMENT_JSON_LENGTH,
  MAX_DELETE_FILES,
  MAX_FILENAME_LENGTH,
} from '../../../constants';
import {
  limitedArraySchema,
  limitedStringSchema,
  NonEmptyString,
  paginationSchema,
} from '../../../schema';
import {
  UserCommentAttachmentPayloadRt,
  AlertAttachmentPayloadRt,
  ActionsAttachmentPayloadRt,
  ExternalReferenceNoSOAttachmentPayloadRt,
  ExternalReferenceSOAttachmentPayloadRt,
  ExternalReferenceSOWithoutRefsAttachmentPayloadRt,
  PersistableStateAttachmentPayloadRt,
  AttachmentType,
  AttachmentRt,
  EventAttachmentPayloadRt,
} from '../../domain/attachment/v1';

/**
 * Files
 */

const MIN_DELETE_IDS = 1;

export const BulkDeleteFileAttachmentsRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_DELETE_FILES,
    fieldName: 'ids',
  }),
});

export const PostFileAttachmentRequestRt = rt.intersection([
  rt.strict({
    file: rt.unknown,
  }),
  rt.exact(
    rt.partial({
      filename: limitedStringSchema({ fieldName: 'filename', min: 1, max: MAX_FILENAME_LENGTH }),
    })
  ),
]);

/**
 * Attachments bulk delete
 */

export const BulkDeleteAttachmentsBySavedObjectIdRequestRt = rt.strict({
  ids: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_BULK_DELETE_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

/** Bulk delete by the ids that attachments of one type reference (alert ids, event ids, ...). */
export const BulkDeleteAttachmentsByAttachmentIdRequestRt = rt.strict({
  type: limitedStringSchema({ fieldName: 'type', min: 1, max: MAX_ATTACHMENT_TYPE_LENGTH }),
  attachmentIds: limitedArraySchema({
    codec: NonEmptyString,
    min: MIN_DELETE_IDS,
    max: MAX_BULK_DELETE_ATTACHMENTS,
    fieldName: 'attachmentIds',
  }),
});

export type BulkDeleteAttachmentsBySavedObjectIdRequest = rt.TypeOf<
  typeof BulkDeleteAttachmentsBySavedObjectIdRequestRt
>;
export type BulkDeleteAttachmentsByAttachmentIdRequest = rt.TypeOf<
  typeof BulkDeleteAttachmentsByAttachmentIdRequestRt
>;
export type BulkDeleteAttachmentsRequest =
  | BulkDeleteAttachmentsBySavedObjectIdRequest
  | BulkDeleteAttachmentsByAttachmentIdRequest;
export type BulkDeleteFileAttachmentsRequest = rt.TypeOf<typeof BulkDeleteFileAttachmentsRequestRt>;
export type PostFileAttachmentRequest = rt.TypeOf<typeof PostFileAttachmentRequestRt>;

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

export const AttachmentRequestWithoutRefsRt = rt.union([
  BasicAttachmentRequestRt,
  ExternalReferenceSOWithoutRefsAttachmentPayloadRt,
]);

export const AttachmentPatchRequestRt = rt.intersection([
  /**
   * Partial updates are not allowed.
   * We want to prevent the user for changing the type without removing invalid fields.
   *
   * injectAttachmentSOAttributesFromRefsForPatch is dependent on this assumption.
   * The consumers of the persistable attachment service should always get the
   * persistableStateAttachmentState on a patch.
   */
  AttachmentRequestRt,
  rt.strict({ id: rt.string, version: rt.string }),
]);

export const AttachmentsFindResponseRt = rt.strict({
  comments: rt.array(AttachmentRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export const FindAttachmentsQueryParamsRt = rt.intersection([
  rt.exact(
    rt.partial({
      /**
       * Order to sort the response
       */
      sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
    })
  ),
  paginationSchema({ maxPerPage: MAX_COMMENTS_PER_PAGE }),
]);

export type FindAttachmentsQueryParams = rt.TypeOf<typeof FindAttachmentsQueryParamsRt>;
export type AttachmentsFindResponse = rt.TypeOf<typeof AttachmentsFindResponseRt>;
export type AttachmentRequest = rt.TypeOf<typeof AttachmentRequestRt>;
export type AttachmentPatchRequest = rt.TypeOf<typeof AttachmentPatchRequestRt>;
