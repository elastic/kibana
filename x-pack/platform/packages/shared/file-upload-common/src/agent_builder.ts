/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';

/** Agent Builder attachment type for the inline file upload card. */
export const FILE_UPLOAD_ATTACHMENT_TYPE = 'platform.file_upload' as const;

/** Agent Builder skill id that lets the agent offer the file upload card. */
export const FILE_UPLOAD_SKILL_ID = 'file-upload' as const;

/** Location reported to file upload telemetry for uploads started from Agent Builder. */
export const FILE_UPLOAD_AGENT_BUILDER_LOCATION = 'agent-builder' as const;

export const fileUploadAttachmentDataSchema = lazySchema(() =>
  z.object({
    reason: z.string().max(1_000).optional(),
    suggested_index_name: z.string().max(255).optional(),
  })
);

/**
 * Data stored on a file upload attachment. It only carries presentation hints: once the user has
 * uploaded a file, the target index name is stored as the attachment's `origin`.
 */
export type FileUploadAttachmentData = z.infer<typeof fileUploadAttachmentDataSchema>;

export type FileUploadAttachment = Attachment<
  typeof FILE_UPLOAD_ATTACHMENT_TYPE,
  FileUploadAttachmentData
>;
