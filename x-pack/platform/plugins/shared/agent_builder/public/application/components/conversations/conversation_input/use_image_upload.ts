/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastInput } from '@kbn/core/public';
import { AttachmentType, SUPPORTED_PDF_MIME_TYPE } from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import {
  processImageFile,
  processPdfFile,
  getUniqueName,
  rejectIfTooManyImages,
} from './upload_image';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useKibana } from '../../../hooks/use_kibana';
import { useConversationContext } from '../../../context/conversation/conversation_context';

export interface UseImageUploadParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
}

export interface UseImageUploadResult {
  uploadingNames: Set<string>;
  isUploadingPdf: boolean;
  handlePasteFile?: (file: File) => string | undefined;
  handleAfterInput: () => void;
  handleRemoveAttachment?: (attachment: ConversationAttachment) => void;
}

export const useImageUpload = ({
  addErrorToast,
  messageEditorController,
}: UseImageUploadParams): UseImageUploadResult => {
  const { filesClient, pdfFilesClient } = useAgentBuilderServices();
  const { services } = useKibana();
  const { attachments, conversationId, upsertAttachments, removeAttachment } =
    useConversationContext();
  const [uploadingNames, setUploadingNames] = useState<Set<string>>(new Set());
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const uploadControllers = useRef<Map<string, AbortController>>(new Map());

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  // Abort every in-flight upload when navigating away from this conversation
  useEffect(() => {
    const controllers = uploadControllers.current;
    return () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
      setUploadingNames(new Set());
    };
  }, [conversationId]);

  const handlePasteFile = useCallback(
    (file: File): string | undefined => {
      if (!upsertAttachments) return undefined;
      const current = attachmentsRef.current ?? [];

      if (file.type === SUPPORTED_PDF_MIME_TYPE) {
        // POC: max 1 PDF per message, a 2nd paste is ignored. No chip, no uploadingNames,
        // no uploading pill and no abort on conversation change.
        const hasPdf = current.some((a) => !('items' in a) && a.type === AttachmentType.pdf);
        if (!pdfFilesClient || hasPdf || isUploadingPdf) return undefined;
        setIsUploadingPdf(true);
        processPdfFile({ file, filesClient: pdfFilesClient, upsertAttachments }).finally(() =>
          setIsUploadingPdf(false)
        );
        return undefined;
      }

      const existingImageNames = new Set(
        current.flatMap((a) =>
          !('items' in a) && a.type === AttachmentType.image
            ? [(a.data as { name?: string }).name ?? '']
            : []
        )
      );
      // Also include in-flight names so two simultaneous pastes don't collide
      for (const n of uploadingNames) existingImageNames.add(n);

      if (
        rejectIfTooManyImages({
          currentImageCount: existingImageNames.size,
          addErrorToast,
          reportEvent: services.analytics.reportEvent,
        })
      ) {
        return undefined;
      }

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
      pdfFilesClient,
      isUploadingPdf,
      addErrorToast,
      services.analytics,
      uploadingNames,
      messageEditorController,
    ]
  );

  const handleAfterInput = useCallback(() => {
    const placeholderNames = new Set(messageEditorController.getPlaceholderNames());

    const abortUpload = (name: string) => {
      uploadControllers.current.get(name)?.abort();
      uploadControllers.current.delete(name);
      setUploadingNames((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    };

    const current = attachmentsRef.current;
    if (current && removeAttachment) {
      for (let i = current.length - 1; i >= 0; i--) {
        const a = current[i];
        if ('items' in a || a.type !== AttachmentType.image) continue;
        const name = (a.data as { name?: string }).name;
        if (name && !placeholderNames.has(name)) {
          abortUpload(name);
          removeAttachment(i);
        }
      }
    }

    // To remove a pill if a placeholder was removed before upload completes.
    for (const name of uploadingNames) {
      if (!placeholderNames.has(name)) {
        abortUpload(name);
      }
    }
  }, [removeAttachment, messageEditorController, uploadingNames]);

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
    isUploadingPdf,
    handlePasteFile,
    handleAfterInput,
    handleRemoveAttachment,
  };
};
