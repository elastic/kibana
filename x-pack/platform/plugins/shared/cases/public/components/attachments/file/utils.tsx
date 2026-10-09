/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FileAttachmentMetadataSchema,
  type FileAttachmentMetadata,
} from '../../../../common/types/domain_zod/attachment/file/v2';

import { FILE_ATTACHMENT_TYPE } from '../../../../common/constants';
import {
  compressionMimeTypes,
  IMAGE_MIME_TYPES,
  textMimeTypes,
  pdfMimeTypes,
} from '../../../../common/constants/mime_types';
import type { AttachmentUIV2, CaseUI } from '../../../../common/ui/types';
import { resolveUnifiedAttachmentType } from '../../../../common/utils/attachments/migration_utils';
import * as i18n from './translations';

export const isImage = (file: { mimeType?: string }) => file.mimeType?.startsWith('image/');

export const parseMimeType = (mimeType: string | undefined) => {
  if (typeof mimeType === 'undefined') {
    return i18n.UNKNOWN_MIME_TYPE;
  }

  if (IMAGE_MIME_TYPES.has(mimeType)) {
    return i18n.IMAGE_MIME_TYPE;
  }

  if (textMimeTypes.includes(mimeType)) {
    return i18n.TEXT_MIME_TYPE;
  }

  if (compressionMimeTypes.includes(mimeType)) {
    return i18n.COMPRESSED_MIME_TYPE;
  }

  if (pdfMimeTypes.includes(mimeType)) {
    return i18n.PDF_MIME_TYPE;
  }

  const result = mimeType.split('/');

  if (result.length <= 1 || result[0] === '') {
    return i18n.UNKNOWN_MIME_TYPE;
  }

  return result[0].charAt(0).toUpperCase() + result[0].slice(1);
};

/** Runtime guard for the unified `file` attachment metadata. */
export const isValidFileMetadata = (metadata: unknown): metadata is FileAttachmentMetadata => {
  return FileAttachmentMetadataSchema.safeParse(metadata).success;
};

export const getFileFromReferenceMetadata = ({
  fileId,
  metadata,
}: {
  fileId: string;
  metadata: FileAttachmentMetadata;
}) => {
  const [fileMetadata] = metadata.files;
  return {
    id: fileId,
    ...fileMetadata,
  };
};

const isFileAttachment = (comment: AttachmentUIV2, owner: string): boolean =>
  resolveUnifiedAttachmentType(comment, owner) === FILE_ATTACHMENT_TYPE;

/** Minimal identity of a file already attached to a case (name + extension). */
export interface AttachedFile {
  name: string;
  extension: string;
}

/** Name + extension of every file already attached to a case. */
export const getFilesFromComments = (
  comments: CaseUI['comments'],
  owner: string
): AttachedFile[] => {
  const files: AttachedFile[] = [];
  for (const comment of comments) {
    if (
      isFileAttachment(comment, owner) &&
      'metadata' in comment &&
      isValidFileMetadata(comment.metadata)
    ) {
      for (const { name, extension } of comment.metadata.files) {
        files.push({ name, extension });
      }
    }
  }
  return files;
};

/**
 * Collects the set of file ids referenced by a case's comments. Used by
 * `CaseViewFiles` to intersect the files-API response against the (possibly
 * filtered) comment list so the badge and the file table stay in sync.
 */
export const getFileIdsFromComments = (
  comments: CaseUI['comments'],
  owner: string
): Set<string> => {
  const ids = new Set<string>();
  for (const comment of comments) {
    if (isFileAttachment(comment, owner) && 'attachmentId' in comment) {
      const attachmentIds = Array.isArray(comment.attachmentId)
        ? comment.attachmentId
        : [comment.attachmentId];
      for (const id of attachmentIds) {
        ids.add(id);
      }
    }
  }
  return ids;
};
