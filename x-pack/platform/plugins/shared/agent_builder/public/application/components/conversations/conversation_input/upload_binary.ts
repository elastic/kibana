/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common';
import {
  AttachmentType,
  type SupportedBinaryMimeType,
} from '@kbn/agent-builder-common/attachments';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import type { AttachmentsService } from '../../../../services/attachments';

const labels = {
  uploadError: i18n.translate('xpack.agentBuilder.uploadBinary.uploadError', {
    defaultMessage: 'Could not upload the file.',
  }),
};

export type UploadBinaryResult =
  | { status: 'done'; attachment: VersionedAttachment; fileId: string }
  | { status: 'aborted' }
  | { status: 'failed'; message: string };

/**
 * Uploads the file to the Files service, then asks the server to read it into a binary
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
