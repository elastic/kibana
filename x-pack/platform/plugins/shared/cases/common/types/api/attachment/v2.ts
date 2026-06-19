/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_BULK_CREATE_ATTACHMENTS } from '../../../constants';
import { limitedArraySchema } from '../../../schema';
import type { BulkGetAttachmentsRequest } from './v1';
import {
  AttachmentRequestSchema,
  AttachmentRequestWithoutRefsSchema,
  AttachmentPatchRequestSchema,
} from './v1';

export type { BulkGetAttachmentsRequest as BulkGetAttachmentsRequestV2 };
import {
  AttachmentSchemaV2,
  AttachmentsSchemaV2,
  UnifiedAttachmentPayloadSchema,
  UnifiedReferenceAttachmentPayloadSchema,
  UnifiedValueAttachmentPayloadSchema,
} from '../../domain/attachment/v2';

export const UnifiedAttachmentPatchRequestSchema = z.union([
  UnifiedReferenceAttachmentPayloadSchema.extend({
    id: z.string().max(512),
    version: z.string().max(512),
  }),
  UnifiedValueAttachmentPayloadSchema.extend({
    id: z.string().max(512),
    version: z.string().max(512),
  }),
]);

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
  UnifiedAttachmentPatchRequestSchema,
]);

export const BulkCreateAttachmentsRequestSchemaV2 = limitedArraySchema({
  codec: AttachmentRequestSchemaV2,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

export const AttachmentsFindResponseSchemaV2 = z.object({
  comments: z.array(AttachmentSchemaV2),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

export const BulkGetAttachmentsResponseSchemaV2 = z.object({
  attachments: AttachmentsSchemaV2,
  errors: z.array(
    z.object({
      error: z.string().max(32000),
      message: z.string().max(32000),
      status: z.union([z.undefined(), z.number()]),
      savedObjectId: z.string().max(512),
    })
  ),
});

export type AttachmentRequestV2 = z.infer<typeof AttachmentRequestSchemaV2>;
export type AttachmentPatchRequestV2 = z.infer<typeof AttachmentPatchRequestSchemaV2>;
export type BulkCreateAttachmentsRequestV2 = z.infer<typeof BulkCreateAttachmentsRequestSchemaV2>;
export type AttachmentsFindResponseV2 = z.infer<typeof AttachmentsFindResponseSchemaV2>;
export type BulkGetAttachmentsResponseV2 = z.infer<typeof BulkGetAttachmentsResponseSchemaV2>;
