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
  MAX_PDF_BYTES,
  SUPPORTED_PDF_MIME_TYPE,
} from '@kbn/agent-builder-common/attachments';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import type { AttachmentsService } from '../../../../services/attachments';

export const MAX_PDFS_PER_MESSAGE = 1;

const FORMATTED_MAX_SIZE = numeral(MAX_PDF_BYTES).format('0.[0] b');

const labels = {
  invalidType: i18n.translate('xpack.agentBuilder.uploadPdf.invalidType', {
    defaultMessage: 'Only PDF files are supported.',
  }),
  tooLarge: i18n.translate('xpack.agentBuilder.uploadPdf.tooLarge', {
    defaultMessage: 'PDF is too large. Maximum size is {maxSize}.',
    values: { maxSize: FORMATTED_MAX_SIZE },
  }),
  uploadError: i18n.translate('xpack.agentBuilder.uploadPdf.uploadError', {
    defaultMessage: 'Could not upload the PDF.',
  }),
  tooMany: i18n.translate('xpack.agentBuilder.uploadPdf.tooMany', {
    defaultMessage: 'You can attach {max, plural, one {# PDF} other {# PDFs}} per message.',
    values: { max: MAX_PDFS_PER_MESSAGE },
  }),
};

/** Shows a toast and returns true when the file is not a PDF or is too large. */
export const rejectInvalidPdf = ({
  file,
  addErrorToast,
}: {
  file: File;
  addErrorToast: (input: ToastInput) => void;
}): boolean => {
  if (file.type !== SUPPORTED_PDF_MIME_TYPE) {
    addErrorToast({ title: labels.invalidType });
    return true;
  }
  if (file.size > MAX_PDF_BYTES) {
    addErrorToast({ title: labels.tooLarge });
    return true;
  }
  return false;
};

/** Blocks adding another PDF once `currentPdfCount` has reached the per-message limit. */
export const rejectIfTooManyPdfs = ({
  currentPdfCount,
  addErrorToast,
}: {
  currentPdfCount: number;
  addErrorToast: (input: ToastInput) => void;
}): boolean => {
  if (currentPdfCount < MAX_PDFS_PER_MESSAGE) return false;
  addErrorToast({ title: labels.tooMany });
  return true;
};

export type UploadPdfResult =
  | { status: 'done'; attachment: VersionedAttachment; fileId: string }
  | { status: 'aborted' }
  | { status: 'failed'; message: string };

/**
 * Uploads the PDF to the Files service, then asks the server to read it into a pdf attachment.
 * Aborting stops either step: Files deletes a half-uploaded file, and the server stops reading
 * and deletes the file. Never throws.
 */
export const uploadPdf = async ({
  file,
  name,
  conversationId,
  pdfFilesClient,
  attachmentsService,
  signal,
}: {
  file: File;
  name: string;
  conversationId: string;
  pdfFilesClient: ScopedFilesClient;
  attachmentsService: AttachmentsService;
  signal: AbortSignal;
}): Promise<UploadPdfResult> => {
  let fileId: string;
  try {
    const { file: fileEntry } = await pdfFilesClient.create({ name, mimeType: file.type });
    fileId = fileEntry.id;
    await pdfFilesClient.upload({
      id: fileId,
      body: file,
      contentType: file.type,
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
    await pdfFilesClient.delete({ id: fileId }).catch(() => {});
    return { status: 'aborted' };
  }

  try {
    const attachment = await attachmentsService.create({
      conversationId,
      type: AttachmentType.pdf,
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
