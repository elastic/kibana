/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SupportedBinaryMimeType } from '@kbn/agent-builder-common/attachments';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';

const labels = {
  uploadError: i18n.translate('xpack.agentBuilder.uploadBinary.uploadError', {
    defaultMessage: 'Could not upload the file.',
  }),
};

export type UploadBinaryResult =
  | { status: 'done'; fileId: string }
  | { status: 'aborted' }
  | { status: 'failed'; message: string };

/**
 * Uploads the file to the Files service. The server reads it when the message is sent.
 * Aborting deletes the file. Never throws.
 */
export const uploadBinary = async ({
  file,
  name,
  mimeType,
  binaryFilesClient,
  signal,
}: {
  file: File;
  name: string;
  mimeType: SupportedBinaryMimeType;
  binaryFilesClient: ScopedFilesClient;
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
    // Aborted right after the upload finished: nothing else owns this file yet.
    await binaryFilesClient.delete({ id: fileId }).catch(() => {});
    return { status: 'aborted' };
  }

  return { status: 'done', fileId };
};
