/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FileEntryType } from '@kbn/agent-builder-server/runner/filestore';
import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';
import { estimateTokens } from '@kbn/agent-builder-genai-utils/tools/utils/token_count';
import type { UploadedFileAttachmentData } from '@kbn/agent-builder-common/attachments';
import { MOUNT_POINTS } from '../../../../filesystem/mount_points';
import type { AttachmentFileEntry, AttachmentRawBody } from './types';

/**
 * Store-relative path for an attachment entry (relative to the `/attachments`
 * mount). The agent-visible absolute path is `MOUNT_POINTS.attachments` + this.
 */
export const getAttachmentEntryPath = (id: string): string => `/${id}`;

/** Agent-visible absolute path for an attachment entry. */
export const getAttachmentAbsolutePath = (id: string): string =>
  `${MOUNT_POINTS.attachments}${getAttachmentEntryPath(id)}`;

/**
 * Create the VFS file entry for an uploaded-file attachment. The raw bytes
 * are inlined into `content.raw` so server-side tools (e.g. `readContent`) can
 * read them back via the filesystem service. The LLM-facing FS tools are
 * guarded from serving this content (see the attachment guard).
 */
export const createAttachmentEntry = ({
  id,
  bytes,
  data,
}: {
  id: string;
  bytes: Buffer;
  data: UploadedFileAttachmentData;
}): AttachmentFileEntry<AttachmentRawBody> => {
  const body = bytes.toString('utf8');
  return {
    type: 'file',
    path: getAttachmentEntryPath(id),
    content: {
      raw: { body },
      plain_text: body,
    },
    metadata: {
      type: FileEntryType.attachment,
      id,
      token_count: estimateTokens(body),
      readonly: true,
      name: data.name,
      mime: data.mime,
      size: data.size,
    },
  };
};

/** Returns true when the entry is an uploaded-file attachment entry. */
export const isAttachmentFileEntry = (
  entry: FileEntry
): entry is AttachmentFileEntry<AttachmentRawBody> => {
  return entry.metadata.type === FileEntryType.attachment;
};
