/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import numeral from '@elastic/numeral';
import type { ToastInput } from '@kbn/core/public';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import {
  AttachmentType,
  MAX_BINARY_BYTES,
  type SupportedBinaryMimeType,
} from '@kbn/agent-builder-common/attachments';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import type { AttachmentsService } from '../../../../services/attachments';
import { getFileMimeType } from './file_type';

export const MAX_FILES_PER_MESSAGE = 1;

const labels = {
  invalidType: i18n.translate('xpack.agentBuilder.uploadBinary.invalidType', {
    defaultMessage: 'This file type is not supported.',
  }),
  uploadError: i18n.translate('xpack.agentBuilder.uploadBinary.uploadError', {
    defaultMessage: 'Could not upload the file.',
  }),
  tooMany: i18n.translate('xpack.agentBuilder.uploadBinary.tooMany', {
    defaultMessage:
      'You can attach {max, plural, one {# document} other {# documents}} per message.',
    values: { max: MAX_FILES_PER_MESSAGE },
  }),
};

/** Shows a toast and returns true when the file type is not supported or the file is too large. */
export const rejectInvalidFile = ({
  file,
  addErrorToast,
}: {
  file: File;
  addErrorToast: (input: ToastInput) => void;
}): boolean => {
  const mimeType = getFileMimeType(file);
  if (!mimeType) {
    addErrorToast({ title: labels.invalidType });
    return true;
  }
  const maxBytes = MAX_BINARY_BYTES[mimeType];
  if (file.size > maxBytes) {
    addErrorToast({
      title: i18n.translate('xpack.agentBuilder.uploadBinary.tooLarge', {
        defaultMessage: 'The file is too large. The maximum size is {maxSize}.',
        values: { maxSize: numeral(maxBytes).format('0.[0] b') },
      }),
    });
    return true;
  }
  return false;
};

/** Blocks adding another document once `currentFileCount` has reached the per-message limit. */
export const rejectIfTooManyFiles = ({
  currentFileCount,
  addErrorToast,
}: {
  currentFileCount: number;
  addErrorToast: (input: ToastInput) => void;
}): boolean => {
  if (currentFileCount < MAX_FILES_PER_MESSAGE) return false;
  addErrorToast({ title: labels.tooMany });
  return true;
};

export type UploadBinaryResult =
  | { status: 'done'; attachment: VersionedAttachment; fileId: string }
  | { status: 'aborted' }
  | { status: 'failed'; message: string };

/**
 * Uploads the file to the Files service, then asks the server to read it into a document
 * attachment. Aborting stops either step: Files deletes a half-uploaded file, and the server
 * stops reading. The file stays in Files after a stopped read. Never throws.
 */
export const uploadBinary = async ({
  file,
  name,
  mimeType,
  conversationId,
  binaryFilesClient,
  attachmentsService,
  signal,
}: {
  file: File;
  name: string;
  mimeType: SupportedBinaryMimeType;
  conversationId: string;
  binaryFilesClient: ScopedFilesClient;
  attachmentsService: AttachmentsService;
  signal: AbortSignal;
}): Promise<UploadBinaryResult> => {
  let fileId: string;
  try {
    const { file: fileEntry } = await binaryFilesClient.create({ name, mimeType });
    fileId = fileEntry.id;
    await binaryFilesClient.upload({
      id: fileId,
      body: file,
      contentType: mimeType,
      abortSignal: signal,
      selfDestructOnAbort: true,
    });
  } catch {
    return signal.aborted
      ? { status: 'aborted' }
      : { status: 'failed', message: labels.uploadError };
  }

  if (signal.aborted) {
    // Aborted between the two steps: nothing else owns this file yet.
    await binaryFilesClient.delete({ id: fileId }).catch(() => {});
    return { status: 'aborted' };
  }

  try {
    const attachment = await attachmentsService.create({
      conversationId,
      type: AttachmentType.binary,
      origin: fileId,
      signal,
    });
    return { status: 'done', attachment, fileId };
  } catch (error) {
    return signal.aborted
      ? { status: 'aborted' }
      : { status: 'failed', message: formatAgentBuilderErrorMessage(error) };
  }
};
