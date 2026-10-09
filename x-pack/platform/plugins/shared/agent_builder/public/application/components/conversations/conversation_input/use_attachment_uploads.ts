/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ToastInput } from '@kbn/core/public';
import {
  AttachmentType,
  SUPPORTED_PDF_MIME_TYPE,
  type ConversationAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { useImageUpload } from './use_image_upload';
import { usePdfUpload } from './use_pdf_upload';
import { useIsPdfUploadAvailable } from '../../../hooks/use_is_pdf_upload_available';

export interface UseAttachmentUploadsParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
  createConversation: (agentId: string) => Promise<{ id: string }>;
}

/** Puts the image and PDF uploads behind one set of handlers for the message editor and the pills. */
export const useAttachmentUploads = ({
  addErrorToast,
  messageEditorController,
  createConversation,
}: UseAttachmentUploadsParams) => {
  const {
    uploadingNames,
    handlePasteFile: handlePasteImage,
    handleAfterInput: handleAfterImageInput,
    handleRemoveAttachment: handleRemoveImageAttachment,
  } = useImageUpload({
    addErrorToast,
    messageEditorController,
  });

  const isPdfUploadAvailable = useIsPdfUploadAvailable();
  const {
    loadingPdfNames,
    pendingConversationId,
    handlePastePdf,
    handleAfterInput: handleAfterPdfInput,
    handleRemovePdf,
    handleSubmitted: handlePdfSubmitted,
  } = usePdfUpload({
    addErrorToast,
    messageEditorController,
    createConversation,
  });

  const uploadingChipNames = useMemo(
    () => new Set([...uploadingNames, ...loadingPdfNames]),
    [uploadingNames, loadingPdfNames]
  );

  const handlePasteFile = useCallback(
    (file: File): string | undefined =>
      file.type === SUPPORTED_PDF_MIME_TYPE ? handlePastePdf?.(file) : handlePasteImage?.(file),
    [handlePastePdf, handlePasteImage]
  );

  const handleAfterInput = useCallback(() => {
    handleAfterImageInput();
    handleAfterPdfInput();
  }, [handleAfterImageInput, handleAfterPdfInput]);

  const handleRemoveAttachment = useCallback(
    (attachment: ConversationAttachment) => {
      if (!('items' in attachment) && attachment.type === AttachmentType.pdf) {
        if (attachment.description) handleRemovePdf(attachment.description);
        return;
      }
      handleRemoveImageAttachment?.(attachment);
    },
    [handleRemovePdf, handleRemoveImageAttachment]
  );

  return {
    uploadingNames,
    loadingPdfNames,
    uploadingChipNames,
    isUploading: uploadingNames.size > 0 || loadingPdfNames.size > 0,
    isPdfUploadAvailable,
    pendingConversationId,
    handlePasteFile,
    handleAfterInput,
    handleRemoveAttachment,
    handleRemoveLoadingPdf: handleRemovePdf,
    handleSubmitted: handlePdfSubmitted,
  };
};
