/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_COMMENTS_PER_PAGE,
  MAX_ATTACHMENT_TYPE_LENGTH,
  MAX_ATTACHMENT_TYPES_PER_QUERY,
} from '../../../constants';
import type { BulkGetAttachmentsRequest } from './v1';
import {
  UnifiedAttachmentSchema,
  UnifiedAttachmentPayloadSchema,
  UnifiedReferenceAttachmentPayloadSchema,
  UnifiedValueAttachmentPayloadSchema,
} from '../../domain/attachment/v2';
import { limitedArraySchema, limitedStringSchema, paginationSchema } from '../../../schema';

export type { BulkGetAttachmentsRequest as BulkGetAttachmentsRequestV2 };

export const UnifiedAttachmentPutRequestSchema = z.union([
  UnifiedReferenceAttachmentPayloadSchema.extend({ version: z.string().max(512) }),
  UnifiedValueAttachmentPayloadSchema.extend({ version: z.string().max(512) }),
]);

export const BulkCreateUnifiedAttachmentsRequestSchema = limitedArraySchema({
  codec: UnifiedAttachmentPayloadSchema,
  min: 0,
  max: MAX_BULK_CREATE_ATTACHMENTS,
  fieldName: 'attachments',
});

const AttachmentTypeStringSchema = limitedStringSchema({
  fieldName: 'type',
  min: 1,
  max: MAX_ATTACHMENT_TYPE_LENGTH,
});
const AttachmentTypeQueryParamSchema = z.union([
  AttachmentTypeStringSchema,
  limitedArraySchema({
    codec: AttachmentTypeStringSchema,
    min: 1,
    max: MAX_ATTACHMENT_TYPES_PER_QUERY,
    fieldName: 'type',
  }),
]);

export const UnifiedAttachmentsFindQueryParamsSchema = paginationSchema({
  maxPerPage: MAX_COMMENTS_PER_PAGE,
}).extend({
  sortOrder: z.enum(['desc', 'asc']).optional(),
  type: AttachmentTypeQueryParamSchema.optional(),
});

export const UnifiedAttachmentsFindResponseSchema = z.object({
  data: z.array(UnifiedAttachmentSchema),
  page: z.number(),
  per_page: z.number(),
  total: z.number(),
});

export type UnifiedAttachmentPutRequest = z.infer<typeof UnifiedAttachmentPutRequestSchema>;
export type BulkCreateUnifiedAttachmentsRequest = z.infer<
  typeof BulkCreateUnifiedAttachmentsRequestSchema
>;
export type UnifiedAttachmentsFindQueryParams = z.infer<
  typeof UnifiedAttachmentsFindQueryParamsSchema
>;
export type UnifiedAttachmentsFindResponse = z.infer<typeof UnifiedAttachmentsFindResponseSchema>;
