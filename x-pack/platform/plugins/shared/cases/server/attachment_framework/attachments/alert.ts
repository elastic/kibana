/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { UnifiedAttachmentTypeSetup } from '../types';
import { STACK_ALERT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

export const stackAlertAttachmentType: UnifiedAttachmentTypeSetup = {
  id: STACK_ALERT_ATTACHMENT_TYPE,
  schemaValidator: (metadata: unknown) => {
    decodeStackAlertAttachmentMetadata(metadata);
  },
};

export const StackAlertAttachmentMetadataRt = z.object({
  index: z.union([z.string(), z.array(z.string())]).optional(),
  rule: z
    .union([
      z.null(),
      z.object({
        id: z.string().nullable().optional(),
        name: z.string().nullable().optional(),
      }),
    ])
    .optional(),
});

export type StackAlertAttachmentMetadata = z.infer<typeof StackAlertAttachmentMetadataRt>;

/**
 * Decodes and validates stack alert attachment metadata.
 * Throws `ZodError` on failure; callers can surface this as `badRequest` at
 * the boundary if desired.
 */
export const decodeStackAlertAttachmentMetadata = (
  metadata: unknown
): StackAlertAttachmentMetadata => StackAlertAttachmentMetadataRt.parse(metadata ?? {});
