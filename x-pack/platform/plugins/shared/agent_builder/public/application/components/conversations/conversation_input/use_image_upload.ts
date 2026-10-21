/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastInput } from '@kbn/core/public';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { processImageFile, getUniqueName, rejectIfTooManyImages } from './upload_image';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useKibana } from '../../../hooks/use_kibana';
import { useConversationContext } from '../../../context/conversation/conversation_context';

export interface UseImageUploadParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
}

export interface UseImageUploadResult {
  uploadingNames: Set<string>;
  handlePasteFile?: (file: File) => string | undefined;
  handleAfterInput: () => void;
  handleRemoveAttachment?: (attachment: ConversationAttachment) => void;
}

export const useImageUpload = ({
  addErrorToast,
  messageEditorController,
}: UseImageUploadParams): UseImageUploadResult => {
  const { filesClient } = useAgentBuilderServices();
  const { services } = useKibana();
  const { attachments, conversationId, upsertAttachments, removeAttachment } =
    useConversationContext();
  const [uploadingNames, setUploadingNames] = useState<Set<string>>(new Set());
  const uploadControllers = useRef<Map<string, AbortController>>(new Map());
  // Image attachments whose chip left the editor, kept so undo/redo can bring them back
  const detachedAttachments = useRef<Map<string, ConversationAttachment>>(new Map());

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  // Abort every in-flight upload when navigating away from this conversation
  useEffect(() => {
    const controllers = uploadControllers.current;
    const detached = detachedAttachments.current;
    return () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
      detached.clear();
      setUploadingNames(new Set());
    };
  }, [conversationId]);

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
      // Names of detached images and hidden uploads stay taken, so their chip can come back
      const takenNames = new Set([
        ...existingImageNames,
        ...detachedAttachments.current.keys(),
        ...uploadControllers.current.keys(),
      ]);

      if (
        rejectIfTooManyImages({
          currentImageCount: existingImageNames.size,
          addErrorToast,
          reportEvent: services.analytics.reportEvent,
        })
      ) {
        return undefined;
      }

      const name = getUniqueName(file.name || 'image.png', takenNames);
      const controller = new AbortController();
      uploadControllers.current.set(name, controller);

      setUploadingNames((prev) => new Set([...prev, name]));
      processImageFile({
        file,
        name,
        filesClient,
        upsertAttachments: (uploaded) => {
          // The chip can be removed while uploading; keep the result until it comes back
          if (messageEditorController.getPlaceholderNames().includes(name)) {
            upsertAttachments(uploaded);
            return;
          }
          for (const attachment of uploaded) {
            detachedAttachments.current.set(name, attachment);
          }
        },
        addErrorToast,
        reportEvent: services.analytics.reportEvent,
        abortSignal: controller.signal,
      })
        .then((success) => {
          // A name can be reused after this upload was aborted and removed.
          if (!success && uploadControllers.current.get(name) === controller) {
            messageEditorController.removePlaceholderByName(name);
          }
        })
        .finally(() => {
          if (uploadControllers.current.get(name) !== controller) return;
          uploadControllers.current.delete(name);
          setUploadingNames((prev) => {
            const next = new Set(prev);
            next.delete(name);
            return next;
          });
        });
      return name;
    },
    [
      upsertAttachments,
      filesClient,
      addErrorToast,
      services.analytics,
      uploadingNames,
      messageEditorController,
    ]
  );

  const handleAfterInput = useCallback(() => {
    const placeholderNames = new Set(messageEditorController.getPlaceholderNames());

    // Keep the attachment of a removed chip aside, so undo can bring it back
    const current = attachmentsRef.current;
    if (current && removeAttachment) {
      for (let i = current.length - 1; i >= 0; i--) {
        const a = current[i];
        if ('items' in a || a.type !== AttachmentType.image) continue;
        const name = (a.data as { name?: string }).name;
        if (name && !placeholderNames.has(name) && !detachedAttachments.current.has(name)) {
          detachedAttachments.current.set(name, a);
          removeAttachment(i);
        }
      }
    }

    // Undo or redo brought a chip back, so its attachment comes back too
    const restored = [...placeholderNames].flatMap((name) => {
      const attachment = detachedAttachments.current.get(name);
      if (!attachment) return [];
      detachedAttachments.current.delete(name);
      return [attachment];
    });
    if (restored.length > 0) {
      upsertAttachments?.(restored);
    }

    // Uploads keep running while their chip is removed, but only chips in the editor show progress
    const visibleUploadingNames = [...uploadControllers.current.keys()].filter((name) =>
      placeholderNames.has(name)
    );
    setUploadingNames((prev) =>
      prev.size === visibleUploadingNames.length &&
      visibleUploadingNames.every((name) => prev.has(name))
        ? prev
        : new Set(visibleUploadingNames)
    );
  }, [removeAttachment, upsertAttachments, messageEditorController]);

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

  return {
    uploadingNames,
    handlePasteFile,
    handleAfterInput,
    handleRemoveAttachment,
  };
};
