/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_BULK_GET_ATTACHMENTS,
  MAX_COMMENTS_PER_PAGE,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_ATTACHMENT_TYPES_PER_QUERY,
} from '../../../constants';
import { UnifiedAttachmentRt, UnifiedAttachmentPayloadRt } from '../../domain/attachment/v2';
import { limitedArraySchema, limitedStringSchema, paginationSchema } from '../../../schema';

export const UnifiedAttachmentPatchRequestRt = rt.intersection([
  UnifiedAttachmentPayloadRt,
  rt.strict({ id: rt.string, version: rt.string }),
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
