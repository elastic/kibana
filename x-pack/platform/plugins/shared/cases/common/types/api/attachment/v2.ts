/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';
import type { BulkGetAttachmentsRequest } from './v1';
import {
  AttachmentPatchRequestRt,
  AttachmentRequestRt,
  AttachmentRequestWithoutRefsRt,
} from './v1';
import {
  AttachmentRtV2,
  UnifiedAttachmentPayloadRt,
  UnifiedAttachmentRt,
} from '../../domain/attachment/v2';
import { limitedArraySchema } from '../../../schema';

// Same shape in v1 and v2 (just saved object ids); re-exported under the V2
// alias for attachmentApiV2 namespace completeness.
export type { BulkGetAttachmentsRequest as BulkGetAttachmentsRequestV2 };

// --- Unified-only: no legacy (v1) form, no wire back-compat to preserve ---

export const UnifiedAttachmentPatchRequestRt = rt.intersection([
  UnifiedAttachmentPayloadRt,
  rt.strict({ id: rt.string, version: rt.string }),
]);

// Unified-only bulk payload. Client/service accept only unified; the route
// converts the mixed wire body before calling the client.
export const BulkCreateUnifiedAttachmentsRequestRt = limitedArraySchema({
  codec: UnifiedAttachmentPayloadRt,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

// Internal route only, no legacy wire contract to preserve. The client is
// unified-only (post mode-removal), so the response is unified-only too.
export const BulkGetUnifiedAttachmentsResponseRt = rt.strict({
  attachments: rt.array(UnifiedAttachmentRt),
  errors: rt.array(
    rt.strict({
      error: rt.string,
      message: rt.string,
      status: rt.union([rt.undefined, rt.number]),
      savedObjectId: rt.string,
    })
  ),
});

export type BulkCreateUnifiedAttachmentsRequest = rt.TypeOf<
  typeof BulkCreateUnifiedAttachmentsRequestRt
>;
export type BulkGetUnifiedAttachmentsResponse = rt.TypeOf<
  typeof BulkGetUnifiedAttachmentsResponseRt
>;

// --- V2 union: version-spanning (v1 legacy ∪ unified). Used at read/response
// boundaries and any write boundary that still accepts both wire shapes ---

export const AttachmentRequestRtV2 = rt.union([AttachmentRequestRt, UnifiedAttachmentPayloadRt]);
export const AttachmentRequestWithoutRefsRtV2 = rt.union([
  AttachmentRequestWithoutRefsRt,
  UnifiedAttachmentPayloadRt,
]);
export const AttachmentPatchRequestRtV2 = rt.union([
  AttachmentPatchRequestRt,
  UnifiedAttachmentPatchRequestRt,
]);

export const AttachmentsFindResponseRtV2 = rt.strict({
  comments: rt.array(AttachmentRtV2),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export const BulkCreateAttachmentsRequestRtV2 = limitedArraySchema({
  codec: AttachmentRequestRtV2,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export type AttachmentRequestV2 = rt.TypeOf<typeof AttachmentRequestRtV2>;
export type AttachmentPatchRequestV2 = rt.TypeOf<typeof AttachmentPatchRequestRtV2>;
export type AttachmentsFindResponseV2 = rt.TypeOf<typeof AttachmentsFindResponseRtV2>;
export type BulkCreateAttachmentsRequestV2 = rt.TypeOf<typeof BulkCreateAttachmentsRequestRtV2>;
