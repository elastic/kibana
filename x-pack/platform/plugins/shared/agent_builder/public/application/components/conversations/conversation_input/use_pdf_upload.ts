/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { ToastInput } from '@kbn/core/public';
import type { Conversation } from '@kbn/agent-builder-common';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { rejectIfTooManyPdfs, rejectInvalidPdf, uploadPdf } from './upload_pdf';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAgentId } from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { queryKeys } from '../../../query_keys';

const DEFAULT_PDF_NAME = 'document.pdf';

export interface UsePdfUploadParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
  /** Makes the conversation a PDF is read into when the user pastes it in a new chat. */
  createConversation: (agentId: string) => Promise<{ id: string }>;
}

export interface UsePdfUploadResult {
  /** Names of the PDFs that are uploading or being read. */
  loadingPdfNames: Set<string>;
  /** The conversation made for a PDF pasted in a new chat. Send reuses it. */
  pendingConversationId: string | undefined;
  handlePastePdf?: (file: File) => string | undefined;
  handleAfterInput: () => void;
  handleRemovePdf: (name: string) => void;
  /** Tells the hook the PDFs went out with a message, so leaving the screen does not delete them. */
  handleSubmitted: () => void;
}

interface UnsentPdf {
  attachmentId: string;
  conversationId: string;
}

const isPdfInput = (attachment: ConversationAttachment): boolean =>
  !('items' in attachment) && attachment.type === AttachmentType.pdf;

export const usePdfUpload = ({
  addErrorToast,
  messageEditorController,
  createConversation,
}: UsePdfUploadParams): UsePdfUploadResult => {
  const { pdfFilesClient, attachmentsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const agentId = useAgentId();
  const { attachments, conversationId, upsertAttachments, removeAttachment } =
    useConversationContext();
  const [loadingPdfNames, setLoadingPdfNames] = useState<Set<string>>(new Set());
  const [pendingConversationId, setPendingConversationId] = useState<string | undefined>();

  // Uploads and reads that are in flight, by PDF name.
  const controllers = useRef<Map<string, AbortController>>(new Map());
  // PDFs that are read and sit in the input attachments, but are not sent yet.
  const unsentPdfs = useRef<Map<string, UnsentPdf>>(new Map());
  const pendingConversation = useRef<Promise<string> | undefined>();

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const setLoading = useCallback((name: string, isLoading: boolean) => {
    setLoadingPdfNames((prev) => {
      if (prev.has(name) === isLoading) return prev;
      const next = new Set(prev);
      if (isLoading) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }, []);

  const ensurePendingConversation = useCallback((): Promise<string> => {
    if (!pendingConversation.current) {
      if (!agentId) {
        return Promise.reject(new Error('agentId is required to start a conversation'));
      }
      const created = createConversation(agentId).then(({ id }) => {
        setPendingConversationId(id);
        return id;
      });
      created.catch(() => {
        pendingConversation.current = undefined;
      });
      pendingConversation.current = created;
    }
    return pendingConversation.current;
  }, [agentId, createConversation]);

  const removeFromConversationCache = useCallback(
    ({ conversationId: cachedConversationId, attachmentId }: UnsentPdf) => {
      queryClient.setQueryData<Conversation | undefined>(
        queryKeys.conversations.byId(cachedConversationId),
        (old) =>
          old && { ...old, attachments: old.attachments?.filter((a) => a.id !== attachmentId) }
      );
    },
    [queryClient]
  );

  // Removes the pill and best-effort deletes the attachment. The file stays in Files (orphan).
  const deleteUnsentPdf = useCallback(
    (name: string) => {
      const unsent = unsentPdfs.current.get(name);
      if (!unsent) return;
      unsentPdfs.current.delete(name);

      const current = attachmentsRef.current ?? [];
      const index = current.findIndex((a) => isPdfInput(a) && a.id === unsent.attachmentId);
      if (index !== -1) removeAttachment?.(index);

      removeFromConversationCache(unsent);
      attachmentsService.delete({ ...unsent, permanent: true }).catch(() => {});
    },
    [attachmentsService, removeAttachment, removeFromConversationCache]
  );

  // Stops the work and removes everything the PDF left in the editor and the input attachments.
  const removePdf = useCallback(
    (name: string) => {
      messageEditorController.removePlaceholderByName(name, 'pdf');
      controllers.current.get(name)?.abort();
      controllers.current.delete(name);
      setLoading(name, false);
      deleteUnsentPdf(name);
    },
    [messageEditorController, setLoading, deleteUnsentPdf]
  );

  const readPdf = useCallback(
    async ({
      file,
      name,
      controller,
    }: {
      file: File;
      name: string;
      controller: AbortController;
    }) => {
      if (!upsertAttachments) return;

      let targetConversationId = conversationId;
      if (!targetConversationId) {
        try {
          targetConversationId = await ensurePendingConversation();
        } catch {
          // The create mutation shows its own error toast.
          removePdf(name);
          return;
        }
      }
      if (controller.signal.aborted) return;

      const result = await uploadPdf({
        file,
        name,
        conversationId: targetConversationId,
        pdfFilesClient,
        attachmentsService,
        signal: controller.signal,
      });

      // The PDF was removed meanwhile, and its name may belong to a new upload by now.
      if (controllers.current.get(name) !== controller) return;
      if (result.status === 'aborted') return;

      controllers.current.delete(name);
      setLoading(name, false);

      if (result.status === 'failed') {
        addErrorToast({ title: result.message });
        messageEditorController.removePlaceholderByName(name, 'pdf');
        return;
      }

      const { attachment, fileId } = result;
      unsentPdfs.current.set(name, {
        attachmentId: attachment.id,
        conversationId: targetConversationId,
      });
      // Send looks the attachment up here to build the optimistic message.
      queryClient.setQueryData<Conversation | undefined>(
        queryKeys.conversations.byId(targetConversationId),
        (old) =>
          old && {
            ...old,
            attachments: [
              ...(old.attachments ?? []).filter((a) => a.id !== attachment.id),
              attachment,
            ],
          }
      );
      upsertAttachments([
        { id: attachment.id, type: AttachmentType.pdf, origin: fileId, description: name },
      ]);
    },
    [
      upsertAttachments,
      conversationId,
      ensurePendingConversation,
      removePdf,
      pdfFilesClient,
      attachmentsService,
      setLoading,
      addErrorToast,
      messageEditorController,
      queryClient,
    ]
  );

  const handlePastePdf = useCallback(
    (file: File): string | undefined => {
      if (!upsertAttachments) return undefined;
      if (rejectInvalidPdf({ file, addErrorToast })) return undefined;
      if (
        rejectIfTooManyPdfs({
          currentPdfCount: controllers.current.size + unsentPdfs.current.size,
          addErrorToast,
        })
      ) {
        return undefined;
      }

      const name = file.name || DEFAULT_PDF_NAME;
      const controller = new AbortController();
      controllers.current.set(name, controller);
      setLoading(name, true);
      readPdf({ file, name, controller });
      return name;
    },
    [upsertAttachments, addErrorToast, setLoading, readPdf]
  );

  // Keeps the work in step with the chips: a chip the user deleted cancels or deletes its PDF.
  const handleAfterInput = useCallback(() => {
    const chipNames = new Set(messageEditorController.getPlaceholderNames('pdf'));
    for (const name of [...controllers.current.keys(), ...unsentPdfs.current.keys()]) {
      if (!chipNames.has(name)) removePdf(name);
    }
  }, [messageEditorController, removePdf]);

  const handleSubmitted = useCallback(() => {
    unsentPdfs.current.clear();
    pendingConversation.current = undefined;
    setPendingConversationId(undefined);
  }, []);

  // Leaving the conversation or the agent drops the PDFs that were not sent.
  const leaveRef = useRef<() => void>(() => {});
  leaveRef.current = () => {
    for (const controller of controllers.current.values()) {
      controller.abort();
    }
    controllers.current.clear();
    for (const name of [...unsentPdfs.current.keys()]) {
      deleteUnsentPdf(name);
    }
    pendingConversation.current = undefined;
    setPendingConversationId(undefined);
    setLoadingPdfNames(new Set());
  };
  useEffect(() => {
    const leave = leaveRef;
    return () => leave.current();
  }, [conversationId, agentId]);

  return {
    loadingPdfNames,
    pendingConversationId,
    handlePastePdf: upsertAttachments ? handlePastePdf : undefined,
    handleAfterInput,
    handleRemovePdf: removePdf,
    handleSubmitted,
  };
};
