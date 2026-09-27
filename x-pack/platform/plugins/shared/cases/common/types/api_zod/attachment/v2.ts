/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_BULK_CREATE_ATTACHMENTS, MAX_BULK_GET_ATTACHMENTS } from '../../../constants';
import { limitedArraySchema } from '../../../schema_zod';
import {
  AttachmentRequestSchema,
  AttachmentRequestWithoutRefsSchema,
  AttachmentPatchRequestSchema,
} from './v1';
import {
  UnifiedAttachmentPayloadSchema,
  UnifiedAttachmentSchema,
  UnifiedReferenceAttachmentPayloadSchema,
  UnifiedValueAttachmentPayloadSchema,
} from '../../domain_zod/attachment/v2';

export const UnifiedAttachmentPatchRequestSchema = z.union([
  UnifiedReferenceAttachmentPayloadSchema.extend({ id: z.string(), version: z.string() }),
  UnifiedValueAttachmentPayloadSchema.extend({ id: z.string(), version: z.string() }),
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

export const BulkGetUnifiedAttachmentsRequestSchema = z.object({
  ids: limitedArraySchema({
    codec: z.string(),
    min: 1,
    max: MAX_BULK_GET_ATTACHMENTS,
    fieldName: 'ids',
  }),
});

export const BulkGetAttachmentErrorsSchema = z.array(
  z.object({
    error: z.string(),
    message: z.string(),
    status: z.number().optional(),
    savedObjectId: z.string(),
  })
);

export const BulkGetUnifiedAttachmentsResponseSchema = z.object({
  attachments: z.array(UnifiedAttachmentSchema),
  errors: BulkGetAttachmentErrorsSchema,
});

export type AttachmentRequestV2 = z.infer<typeof AttachmentRequestSchemaV2>;
export type AttachmentPatchRequestV2 = z.infer<typeof AttachmentPatchRequestSchemaV2>;
export type BulkCreateAttachmentsRequestV2 = z.infer<typeof BulkCreateAttachmentsRequestSchemaV2>;
export type BulkGetUnifiedAttachmentsRequest = z.infer<
  typeof BulkGetUnifiedAttachmentsRequestSchema
>;
export type BulkGetUnifiedAttachmentsResponse = z.infer<
  typeof BulkGetUnifiedAttachmentsResponseSchema
>;
