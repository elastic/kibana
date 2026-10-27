/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  AttachmentRequestSchema,
  AttachmentRequestWithoutRefsSchema,
  AttachmentPatchRequestSchema,
} from './v1';
import { AttachmentSchemaV2, UnifiedAttachmentPayloadSchema } from '../../domain/attachment/v2';
import { UnifiedAttachmentPatchRouteRequestSchema } from './v2';

export const AttachmentRequestSchemaV2 = z.union([
  AttachmentRequestSchema,
  UnifiedAttachmentPayloadSchema,
]);

export const AttachmentRequestWithoutRefsSchemaV2 = z.union([
  AttachmentRequestWithoutRefsSchema,
  UnifiedAttachmentPayloadSchema,
]);

export const AttachmentPatchRequestSchemaV2 = z.union([
  AttachmentPatchRequestSchema,
  UnifiedAttachmentPatchRouteRequestSchema,
]);

export const AttachmentsFindResponseSchemaV2 = z.object({
  comments: z.array(AttachmentSchemaV2),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

export type AttachmentRequestV2 = z.infer<typeof AttachmentRequestSchemaV2>;
export type AttachmentPatchRequestV2 = z.infer<typeof AttachmentPatchRequestSchemaV2>;
export type AttachmentsFindResponseV2 = z.infer<typeof AttachmentsFindResponseSchemaV2>;
