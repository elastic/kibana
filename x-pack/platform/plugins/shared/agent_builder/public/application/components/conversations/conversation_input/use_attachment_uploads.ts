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
  isSupportedBinaryMimeType,
  type ConversationAttachment,
} from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import {
  getFileMimeType,
  getFileName,
  getTextFileName,
  TEXT_FILE_MIME_TYPES,
  type FileMimeType,
} from './file_type';
import { rejectIfTooManyFiles, rejectInvalidFile } from './file_checks';
import { getUniqueName } from './upload_image';
import { useImageUpload } from './use_image_upload';
import { useBinaryUpload } from './use_binary_upload';
import { useTextFileUpload } from './use_text_file_upload';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useSupportedBinaryTypes } from '../../../hooks/use_supported_binary_types';

export interface UseAttachmentUploadsParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
  createConversation: (agentId: string) => Promise<{ id: string }>;
}

export interface LoadingFile {
  name: string;
  kind: 'binary' | 'text';
}

/** Names of the files (PDF and text) that are already in the input attachments. */
const getAddedFileNames = (attachments: readonly ConversationAttachment[] = []): string[] =>
  attachments.flatMap((attachment) => {
    if ('items' in attachment) return [];
    if (attachment.type === AttachmentType.binary && attachment.description) {
      return [attachment.description];
    }
    const textFileName = getTextFileName(attachment);
    return textFileName ? [textFileName] : [];
  });

/** Puts the image, PDF and text file uploads behind one set of handlers for the message editor and the pills. */
export const useAttachmentUploads = ({
  addErrorToast,
  messageEditorController,
  createConversation,
}: UseAttachmentUploadsParams) => {
  const { attachments } = useConversationContext();

  const {
    uploadingNames,
    handlePasteFile: handlePasteImage,
    handleAfterInput: handleAfterImageInput,
    handleRemoveAttachment: handleRemoveImageAttachment,
  } = useImageUpload({
    addErrorToast,
    messageEditorController,
  });

  const supportedBinaryMimeTypes = useSupportedBinaryTypes();
  const acceptedFileMimeTypes = useMemo<readonly FileMimeType[]>(
    () => [...TEXT_FILE_MIME_TYPES, ...supportedBinaryMimeTypes],
    [supportedBinaryMimeTypes]
  );

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

  const {
    loadingTextFileNames,
    handlePasteTextFile,
    handleAfterInput: handleAfterTextFileInput,
    handleRemoveTextFile,
  } = useTextFileUpload({ addErrorToast, messageEditorController });

  const loadingFiles = useMemo<LoadingFile[]>(
    () => [
      ...[...loadingBinaryNames].map((name) => ({ name, kind: 'binary' as const })),
      ...[...loadingTextFileNames].map((name) => ({ name, kind: 'text' as const })),
    ],
    [loadingBinaryNames, loadingTextFileNames]
  );

  const uploadingChipNames = useMemo(
    () => new Set([...uploadingNames, ...loadingBinaryNames, ...loadingTextFileNames]),
    [uploadingNames, loadingBinaryNames, loadingTextFileNames]
  );

  const handlePasteFile = useCallback(
    (file: File): string | undefined => {
      const mimeType = getFileMimeType(file);
      if (!mimeType) return handlePasteImage?.(file);

      const isBinary = isSupportedBinaryMimeType(mimeType);
      if (isBinary ? !handlePasteBinary : !handlePasteTextFile) return undefined;
      if (rejectInvalidFile({ file, addErrorToast })) return undefined;

      const addedFileNames = getAddedFileNames(attachments);
      const namesInUse = new Set([
        ...addedFileNames,
        ...loadingBinaryNames,
        ...loadingTextFileNames,
      ]);
      if (rejectIfTooManyFiles({ currentFileCount: namesInUse.size, addErrorToast })) {
        return undefined;
      }

      const name = getUniqueName(getFileName(file, mimeType), namesInUse);
      if (isSupportedBinaryMimeType(mimeType)) {
        handlePasteBinary?.(file, name, mimeType);
      } else {
        handlePasteTextFile?.(file, name);
      }
      return name;
    },
    [
      attachments,
      loadingBinaryNames,
      loadingTextFileNames,
      addErrorToast,
      handlePasteImage,
      handlePasteBinary,
      handlePasteTextFile,
    ]
  );

  const handleAfterInput = useCallback(() => {
    handleAfterImageInput();
    handleAfterBinaryInput();
    handleAfterTextFileInput();
  }, [handleAfterImageInput, handleAfterBinaryInput, handleAfterTextFileInput]);

  const handleRemoveAttachment = useCallback(
    (attachment: ConversationAttachment) => {
      if (!('items' in attachment)) {
        if (attachment.type === AttachmentType.binary) {
          if (attachment.description) handleRemoveBinary(attachment.description);
          return;
        }
        const textFileName = getTextFileName(attachment);
        if (textFileName) {
          handleRemoveTextFile(textFileName);
          return;
        }
      }
      handleRemoveImageAttachment?.(attachment);
    },
    [handleRemoveBinary, handleRemoveTextFile, handleRemoveImageAttachment]
  );

  const handleRemoveLoadingFile = useCallback(
    (name: string) => {
      if (loadingBinaryNames.has(name)) {
        handleRemoveBinary(name);
      } else {
        handleRemoveTextFile(name);
      }
    },
    [loadingBinaryNames, handleRemoveBinary, handleRemoveTextFile]
  );

  return {
    uploadingNames,
    loadingFiles,
    uploadingChipNames,
    isUploading: uploadingNames.size > 0 || loadingFiles.length > 0,
    acceptedFileMimeTypes,
    pendingConversationId,
    handlePasteFile,
    handleAfterInput,
    handleRemoveAttachment,
    handleRemoveLoadingFile,
    handleSubmitted: handleBinarySubmitted,
  };
};
