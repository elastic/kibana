/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import {
  FileAttachmentMetadataSchema,
  FileAttachmentPayloadSchema,
} from '../../../common/types/domain_zod/attachment/file/v2';
import type { FileAttachmentMetadata } from '../../../common/types/domain_zod/attachment/file/v2';
import type { UnifiedAttachmentTypeSetup } from '../types';
import { FILE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

export const fileAttachmentType: UnifiedAttachmentTypeSetup = {
  id: FILE_ATTACHMENT_TYPE,
  schema: FileAttachmentPayloadSchema,
};

export type { FileAttachmentMetadata };

/**
 * Decodes the `metadata` slice for transformer / read paths that don't have
 * the full payload. Mirrors the registry's full-payload `schema` validation.
 */
export const decodeFileAttachmentMetadata = (data: unknown): FileAttachmentMetadata => {
  const result = FileAttachmentMetadataSchema.safeParse(data);
  if (!result.success) {
    throw badRequest(result.error.issues[0]?.message ?? 'Invalid file attachment metadata');
  }
  return result.data;
};
