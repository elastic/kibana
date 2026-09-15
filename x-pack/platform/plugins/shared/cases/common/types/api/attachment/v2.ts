/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';
import type { BulkGetAttachmentsRequest } from './v1';
import { UnifiedAttachmentPayloadRt, UnifiedAttachmentRt } from '../../domain/attachment/v2';
import { limitedArraySchema } from '../../../schema';

// Same shape in v1 and v2 (just saved object ids); re-exported under the V2
// alias for attachmentApiV2 namespace completeness.
export type { BulkGetAttachmentsRequest as BulkGetAttachmentsRequestV2 };

// --- Unified-only: no legacy (v1) form, no wire back-compat to preserve.
// Version-spanning (v1 ∪ unified) types live in ./v2_union (attachmentApiV2Union) ---

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
