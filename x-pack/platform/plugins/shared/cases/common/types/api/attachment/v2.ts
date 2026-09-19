/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';
import type { BulkGetAttachmentsRequest } from './v1';
import { UnifiedAttachmentPayloadRt } from '../../domain/attachment/v2';
import { limitedArraySchema } from '../../../schema';
export type { BulkGetAttachmentsRequest as BulkGetAttachmentsRequestV2 };

export const UnifiedAttachmentPutRequestRt = rt.intersection([
  UnifiedAttachmentPayloadRt,
  rt.strict({ version: rt.string }),
]);

export const BulkCreateUnifiedAttachmentsRequestRt = limitedArraySchema({
  codec: UnifiedAttachmentPayloadRt,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export type UnifiedAttachmentPutRequest = rt.TypeOf<typeof UnifiedAttachmentPutRequestRt>;
export type BulkCreateUnifiedAttachmentsRequest = rt.TypeOf<
  typeof BulkCreateUnifiedAttachmentsRequestRt
>;
