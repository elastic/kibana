/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';
import { AttachmentRequestRt, AttachmentsFindResponseRt } from './v1';
import { UnifiedAttachmentPayloadRt, UnifiedAttachmentRt } from '../../domain/attachment/v2';
import { limitedArraySchema } from '../../../schema';

export const UnifiedAttachmentsFindResponseRt = rt.strict({
  comments: rt.array(UnifiedAttachmentRt),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export const AttachmentRequestRtV2 = rt.union([AttachmentRequestRt, UnifiedAttachmentPayloadRt]);

export const AttachmentsFindResponseRtV2 = rt.union([
  AttachmentsFindResponseRt,
  UnifiedAttachmentsFindResponseRt,
]);

export const BulkCreateAttachmentsRequestRtV2 = limitedArraySchema({
  codec: AttachmentRequestRtV2,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export type UnifiedAttachmentsFindResponse = rt.TypeOf<typeof UnifiedAttachmentsFindResponseRt>;
export type AttachmentRequestV2 = rt.TypeOf<typeof AttachmentRequestRtV2>;
export type AttachmentsFindResponseV2 = rt.TypeOf<typeof AttachmentsFindResponseRtV2>;
export type BulkCreateAttachmentsRequestV2 = rt.TypeOf<typeof BulkCreateAttachmentsRequestRtV2>;
