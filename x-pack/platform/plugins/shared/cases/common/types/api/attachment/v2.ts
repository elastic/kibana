/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';
import { AttachmentRequestRt } from './v1';
import { UnifiedAttachmentPayloadRt } from '../../domain/attachment/v2';
import { limitedArraySchema } from '../../../schema';

export const CombinedAttachmentRequestRt = rt.union([
  AttachmentRequestRt,
  UnifiedAttachmentPayloadRt,
]);

export type CombinedAttachmentRequest = rt.TypeOf<typeof CombinedAttachmentRequestRt>;

export const CombinedBulkCreateAttachmentsRequestRt = limitedArraySchema({
  codec: CombinedAttachmentRequestRt,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export type CombinedBulkCreateAttachmentsRequest = rt.TypeOf<
  typeof CombinedBulkCreateAttachmentsRequestRt
>;
