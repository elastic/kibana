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
  AttachmentsRtV2,
  UnifiedAttachmentPayloadRt,
} from '../../domain/attachment/v2';
import { limitedArraySchema } from '../../../schema';
export type { BulkGetAttachmentsRequest as BulkGetAttachmentsRequestV2 };

export const UnifiedAttachmentPatchRequestRt = rt.intersection([
  UnifiedAttachmentPayloadRt,
  rt.strict({ id: rt.string, version: rt.string }),
]);

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

export const BulkGetAttachmentsResponseRtV2 = rt.strict({
  attachments: AttachmentsRtV2,
  errors: rt.array(
    rt.strict({
      error: rt.string,
      message: rt.string,
      status: rt.union([rt.undefined, rt.number]),
      attachmentId: rt.string,
    })
  ),
});

export type AttachmentRequestV2 = rt.TypeOf<typeof AttachmentRequestRtV2>;
export type AttachmentPatchRequestV2 = rt.TypeOf<typeof AttachmentPatchRequestRtV2>;
export type AttachmentsFindResponseV2 = rt.TypeOf<typeof AttachmentsFindResponseRtV2>;
export type BulkCreateAttachmentsRequestV2 = rt.TypeOf<typeof BulkCreateAttachmentsRequestRtV2>;
export type BulkGetAttachmentsResponseV2 = rt.TypeOf<typeof BulkGetAttachmentsResponseRtV2>;
