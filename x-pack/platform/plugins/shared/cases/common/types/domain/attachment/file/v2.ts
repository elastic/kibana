/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import { FILE_ATTACHMENT_TYPE } from '../../../../constants/attachments';
import { MAX_COMMENT_LENGTH, MAX_TITLE_LENGTH } from '../../../../constants';
import { SingleFileAttachmentMetadataSchema } from '../v1';

export const FileAttachmentMetadataSchema = z
  .object({
    // A file attachment holds exactly one file; the tuple makes that part of the
    // type so callers can read `files[0]` without an undefined guard.
    files: z.tuple([SingleFileAttachmentMetadataSchema.strict()]),
    soType: z.literal(FILE_SO_TYPE),
  })
  .strict();
export type FileAttachmentMetadata = z.infer<typeof FileAttachmentMetadataSchema>;

export const FileAttachmentPayloadSchema = lazySchema(() =>
  z
    .object({
      type: z.literal(FILE_ATTACHMENT_TYPE),
      owner: z.string().max(MAX_TITLE_LENGTH),
      attachmentId: z.string().max(MAX_TITLE_LENGTH),
      // The message text sent with the file.
      data: z
        .object({ content: z.string().max(MAX_COMMENT_LENGTH) })
        .strict()
        .optional(),
      metadata: FileAttachmentMetadataSchema,
    })
    .strict()
);
export type FileAttachmentPayload = z.infer<typeof FileAttachmentPayloadSchema>;
