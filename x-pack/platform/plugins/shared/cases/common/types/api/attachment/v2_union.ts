/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import {
  AttachmentPatchRequestRt,
  AttachmentRequestRt,
  AttachmentRequestWithoutRefsRt,
} from './v1';
import { AttachmentRtV2, UnifiedAttachmentPayloadRt } from '../../domain/attachment/v2';
import { UnifiedAttachmentPutRequestRt } from './v2';

export const AttachmentRequestRtV2 = rt.union([AttachmentRequestRt, UnifiedAttachmentPayloadRt]);
export const AttachmentRequestWithoutRefsRtV2 = rt.union([
  AttachmentRequestWithoutRefsRt,
  UnifiedAttachmentPayloadRt,
]);
export const AttachmentPatchRequestRtV2 = rt.union([
  AttachmentPatchRequestRt,
  rt.intersection([UnifiedAttachmentPutRequestRt, rt.strict({ id: rt.string })]),
]);

export const AttachmentsFindResponseRtV2 = rt.strict({
  comments: rt.array(AttachmentRtV2),
  page: rt.number,
  per_page: rt.number,
  total: rt.number,
});

export type AttachmentRequestV2 = rt.TypeOf<typeof AttachmentRequestRtV2>;
export type AttachmentPatchRequestV2 = rt.TypeOf<typeof AttachmentPatchRequestRtV2>;
export type AttachmentsFindResponseV2 = rt.TypeOf<typeof AttachmentsFindResponseRtV2>;
