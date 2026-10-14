/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { ToastInput } from '@kbn/core/public';
import { AttachmentType, type ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { getDocumentMimeType } from './document_mime_type';
import { useImageUpload } from './use_image_upload';
import { useDocumentUpload } from './use_document_upload';
import { useSupportedDocumentTypes } from '../../../hooks/use_supported_document_types';

export interface UseAttachmentUploadsParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
  createConversation: (agentId: string) => Promise<{ id: string }>;
}

/** Puts the image and document uploads behind one set of handlers for the message editor and the pills. */
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

  const acceptedDocumentMimeTypes = useSupportedDocumentTypes();
  const {
    loadingDocumentNames,
    pendingConversationId,
    handlePasteDocument,
    handleAfterInput: handleAfterDocumentInput,
    handleRemoveDocument,
    handleSubmitted: handleDocumentSubmitted,
  } = useDocumentUpload({
    addErrorToast,
    messageEditorController,
    createConversation,
  });

  const uploadingChipNames = useMemo(
    () => new Set([...uploadingNames, ...loadingDocumentNames]),
    [uploadingNames, loadingDocumentNames]
  );

  const handlePasteFile = useCallback(
    (file: File): string | undefined =>
      getDocumentMimeType(file) ? handlePasteDocument?.(file) : handlePasteImage?.(file),
    [handlePasteDocument, handlePasteImage]
  );

  const handleAfterInput = useCallback(() => {
    handleAfterImageInput();
    handleAfterDocumentInput();
  }, [handleAfterImageInput, handleAfterDocumentInput]);

  const handleRemoveAttachment = useCallback(
    (attachment: ConversationAttachment) => {
      if (!('items' in attachment) && attachment.type === AttachmentType.document) {
        if (attachment.description) handleRemoveDocument(attachment.description);
        return;
      }
      handleRemoveImageAttachment?.(attachment);
    },
    [handleRemoveDocument, handleRemoveImageAttachment]
  );

  return {
    uploadingNames,
    loadingDocumentNames,
    uploadingChipNames,
    isUploading: uploadingNames.size > 0 || loadingDocumentNames.size > 0,
    acceptedDocumentMimeTypes,
    pendingConversationId,
    handlePasteFile,
    handleAfterInput,
    handleRemoveAttachment,
    handleRemoveLoadingDocument: handleRemoveDocument,
    handleSubmitted: handleDocumentSubmitted,
  };
};
