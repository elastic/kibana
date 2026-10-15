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
import { getFileMimeType } from './file_type';
import { useImageUpload } from './use_image_upload';
import { useBinaryUpload } from './use_binary_upload';
import { useSupportedBinaryTypes } from '../../../hooks/use_supported_binary_types';

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

  const acceptedFileMimeTypes = useSupportedBinaryTypes();
  const {
    loadingBinaryNames,
    pendingConversationId,
    handlePasteBinary,
    handleAfterInput: handleAfterBinaryInput,
    handleRemoveBinary,
    handleSubmitted: handleBinarySubmitted,
  } = useBinaryUpload({
    addErrorToast,
    messageEditorController,
    createConversation,
  });

  const uploadingChipNames = useMemo(
    () => new Set([...uploadingNames, ...loadingBinaryNames]),
    [uploadingNames, loadingBinaryNames]
  );

  const handlePasteFile = useCallback(
    (file: File): string | undefined =>
      getFileMimeType(file) ? handlePasteBinary?.(file) : handlePasteImage?.(file),
    [handlePasteBinary, handlePasteImage]
  );

  const handleAfterInput = useCallback(() => {
    handleAfterImageInput();
    handleAfterBinaryInput();
  }, [handleAfterImageInput, handleAfterBinaryInput]);

  const handleRemoveAttachment = useCallback(
    (attachment: ConversationAttachment) => {
      if (!('items' in attachment) && attachment.type === AttachmentType.binary) {
        if (attachment.description) handleRemoveBinary(attachment.description);
        return;
      }
      handleRemoveImageAttachment?.(attachment);
    },
    [handleRemoveBinary, handleRemoveImageAttachment]
  );

  return {
    uploadingNames,
    loadingBinaryNames,
    uploadingChipNames,
    isUploading: uploadingNames.size > 0 || loadingBinaryNames.size > 0,
    acceptedFileMimeTypes,
    pendingConversationId,
    handlePasteFile,
    handleAfterInput,
    handleRemoveAttachment,
    handleRemoveLoadingBinary: handleRemoveBinary,
    handleSubmitted: handleBinarySubmitted,
  };
};
