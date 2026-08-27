/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastInput } from '@kbn/core/public';
import type { ScopedFilesClient } from '@kbn/files-plugin/public';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { processImageFile, getUniqueName } from './upload_image';
import { useExperimentalFeatures } from '../../../hooks/use_experimental_features';

export interface UseImageUploadParams {
  attachments: ConversationAttachment[] | undefined;
  upsertAttachments?: (attachments: ConversationAttachment[]) => void;
  removeAttachment?: (attachmentIndex: number) => void;
  filesClient: ScopedFilesClient;
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
}

export interface UseImageUploadResult {
  uploadingNames: Set<string>;
  /** Returns a unique name synchronously; kicks off the async upload in the background. */
  handlePasteFile: (file: File) => string | undefined;
  /** Text → pill sync: placeholder deleted in editor → remove matching image attachment + abort upload. */
  handleAfterInput: () => void;
  /** Pill → text sync: thumbnail pill removed → remove editor placeholder + abort upload. */
  handleRemoveAttachment: (attachment: ConversationAttachment) => void;
}

const EMPTY_UPLOADING_NAMES = new Set<string>();
const NOOP = () => {};
const NOOP_HANDLE_PASTE_FILE = (): string | undefined => undefined;

export const useImageUpload = ({
  attachments,
  upsertAttachments,
  removeAttachment,
  filesClient,
  addErrorToast,
  messageEditorController,
}: UseImageUploadParams): UseImageUploadResult => {
  const [uploadingNames, setUploadingNames] = useState<Set<string>>(new Set());
  const uploadControllers = useRef<Map<string, AbortController>>(new Map());

  // Keep a ref so callbacks read fresh attachments without stale closure
  const attachmentsRef = useRef(attachments);
  useEffect(() => {
    attachmentsRef.current = attachments;
  });

  const handlePasteFile = useCallback(
    (file: File): string | undefined => {
      if (!upsertAttachments) return undefined;
      const current = attachmentsRef.current ?? [];
      const existingImageNames = new Set(
        current.flatMap((a) =>
          !('items' in a) && a.type === AttachmentType.image
            ? [(a.data as { name?: string }).name ?? '']
            : []
        )
      );
      // Also include in-flight names so two simultaneous pastes don't collide
      for (const n of uploadingNames) existingImageNames.add(n);

      const name = getUniqueName(file.name || 'image.png', existingImageNames);
      const controller = new AbortController();
      uploadControllers.current.set(name, controller);

      setUploadingNames((prev) => new Set([...prev, name]));
      processImageFile({
        file,
        name,
        filesClient,
        upsertAttachments,
        addErrorToast,
        abortSignal: controller.signal,
      }).finally(() => {
        uploadControllers.current.delete(name);
        setUploadingNames((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      });
      return name;
    },
    [upsertAttachments, filesClient, addErrorToast, uploadingNames]
  );

  const handleAfterInput = useCallback(() => {
    const current = attachmentsRef.current;
    if (!current || !removeAttachment) return;
    const placeholderNames = new Set(messageEditorController.getPlaceholderNames());
    for (let i = current.length - 1; i >= 0; i--) {
      const a = current[i];
      if ('items' in a || a.type !== AttachmentType.image) continue;
      const name = (a.data as { name?: string }).name;
      if (name && !placeholderNames.has(name)) {
        uploadControllers.current.get(name)?.abort();
        uploadControllers.current.delete(name);
        setUploadingNames((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        removeAttachment(i);
      }
    }
  }, [removeAttachment, messageEditorController]);

  const handleRemoveAttachment = useCallback(
    (attachment: ConversationAttachment) => {
      if (!removeAttachment) return;
      const current = attachmentsRef.current ?? [];
      const index = current.indexOf(attachment);
      if (!('items' in attachment) && attachment.type === AttachmentType.image) {
        const name = (attachment.data as { name?: string }).name;
        if (name) {
          messageEditorController.removePlaceholderByName(name);
          uploadControllers.current.get(name)?.abort();
          uploadControllers.current.delete(name);
          setUploadingNames((prev) => {
            const next = new Set(prev);
            next.delete(name);
            return next;
          });
        }
      }
      if (index !== -1) removeAttachment(index);
    },
    [removeAttachment, messageEditorController]
  );

  const result: UseImageUploadResult = {
    uploadingNames,
    handlePasteFile,
    handleAfterInput,
    handleRemoveAttachment,
  };

  // #region FEATURE FLAG: image-upload
  // This is the only code required to be deleted when the feature goes GA
  const isImageUploadEnabled = useExperimentalFeatures();
  if (!isImageUploadEnabled) {
    result.uploadingNames = EMPTY_UPLOADING_NAMES;
    result.handlePasteFile = NOOP_HANDLE_PASTE_FILE;
    result.handleAfterInput = NOOP;
    result.handleRemoveAttachment = NOOP;
  }
  // #endregion FEATURE FLAG

  return result;
};
