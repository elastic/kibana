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
import type {
  ConversationAttachment,
  SupportedDocumentMimeType,
} from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { getDocumentMimeType, getDocumentName } from './document_mime_type';
import { rejectIfTooManyDocuments, rejectInvalidDocument, uploadDocument } from './upload_document';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAgentId } from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { queryKeys } from '../../../query_keys';

export interface UseDocumentUploadParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
  createConversation: (agentId: string) => Promise<{ id: string }>;
}

export interface UseDocumentUploadResult {
  loadingDocumentNames: Set<string>;
  pendingConversationId: string | undefined;
  handlePasteDocument?: (file: File) => string | undefined;
  handleAfterInput: () => void;
  handleRemoveDocument: (name: string) => void;
  /** Tells the hook the documents went out with a message, so leaving the screen does not delete them. */
  handleSubmitted: () => void;
}

interface UnsentDocument {
  attachmentId: string;
  conversationId: string;
}

const isDocumentInput = (attachment: ConversationAttachment): boolean =>
  !('items' in attachment) && attachment.type === AttachmentType.document;

export const useDocumentUpload = ({
  addErrorToast,
  messageEditorController,
  createConversation,
}: UseDocumentUploadParams): UseDocumentUploadResult => {
  const { documentFilesClient, attachmentsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const agentId = useAgentId();
  const { attachments, conversationId, upsertAttachments, removeAttachment } =
    useConversationContext();
  const [loadingDocumentNames, setLoadingDocumentNames] = useState<Set<string>>(new Set());
  const [pendingConversationId, setPendingConversationId] = useState<string | undefined>();

  // Uploads and reads that are in flight, by document name.
  const controllers = useRef<Map<string, AbortController>>(new Map());
  // Documents that are read and sit in the input attachments, but are not sent yet.
  const unsentDocuments = useRef<Map<string, UnsentDocument>>(new Map());
  const pendingConversation = useRef<Promise<string> | undefined>();

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const setLoading = useCallback((name: string, isLoading: boolean) => {
    setLoadingDocumentNames((prev) => {
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
    ({ conversationId: cachedConversationId, attachmentId }: UnsentDocument) => {
      queryClient.setQueryData<Conversation | undefined>(
        queryKeys.conversations.byId(cachedConversationId),
        (old) =>
          old && { ...old, attachments: old.attachments?.filter((a) => a.id !== attachmentId) }
      );
    },
    [queryClient]
  );

  // Removes the pill and best-effort deletes the attachment. The file stays in Files (orphan).
  const deleteUnsentDocument = useCallback(
    (name: string) => {
      const unsent = unsentDocuments.current.get(name);
      if (!unsent) return;
      unsentDocuments.current.delete(name);

      const current = attachmentsRef.current ?? [];
      const index = current.findIndex((a) => isDocumentInput(a) && a.id === unsent.attachmentId);
      if (index !== -1) removeAttachment?.(index);

      removeFromConversationCache(unsent);
      attachmentsService.delete({ ...unsent, permanent: true }).catch(() => {});
    },
    [attachmentsService, removeAttachment, removeFromConversationCache]
  );

  // Stops the work and removes everything the document left in the editor and the input attachments.
  const removeDocument = useCallback(
    (name: string) => {
      messageEditorController.removePlaceholderByName(name, 'document');
      controllers.current.get(name)?.abort();
      controllers.current.delete(name);
      setLoading(name, false);
      deleteUnsentDocument(name);
    },
    [messageEditorController, setLoading, deleteUnsentDocument]
  );

  const readDocument = useCallback(
    async ({
      file,
      name,
      mimeType,
      controller,
    }: {
      file: File;
      name: string;
      mimeType: SupportedDocumentMimeType;
      controller: AbortController;
    }) => {
      if (!upsertAttachments) return;

      let targetConversationId = conversationId;
      if (!targetConversationId) {
        try {
          targetConversationId = await ensurePendingConversation();
        } catch {
          // The create mutation shows its own error toast.
          removeDocument(name);
          return;
        }
      }
      if (controller.signal.aborted) return;

      const result = await uploadDocument({
        file,
        name,
        mimeType,
        conversationId: targetConversationId,
        documentFilesClient,
        attachmentsService,
        signal: controller.signal,
      });

      // The document was removed meanwhile, and its name may belong to a new upload by now.
      if (controllers.current.get(name) !== controller) return;
      if (result.status === 'aborted') return;

      controllers.current.delete(name);
      setLoading(name, false);

      if (result.status === 'failed') {
        addErrorToast({ title: result.message });
        messageEditorController.removePlaceholderByName(name, 'document');
        return;
      }

      const { attachment, fileId } = result;
      unsentDocuments.current.set(name, {
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
        { id: attachment.id, type: AttachmentType.document, origin: fileId, description: name },
      ]);
    },
    [
      upsertAttachments,
      conversationId,
      ensurePendingConversation,
      removeDocument,
      documentFilesClient,
      attachmentsService,
      setLoading,
      addErrorToast,
      messageEditorController,
      queryClient,
    ]
  );

  const handlePasteDocument = useCallback(
    (file: File): string | undefined => {
      if (!upsertAttachments) return undefined;
      if (rejectInvalidDocument({ file, addErrorToast })) return undefined;
      const mimeType = getDocumentMimeType(file);
      if (!mimeType) return undefined;
      if (
        rejectIfTooManyDocuments({
          currentDocumentCount: controllers.current.size + unsentDocuments.current.size,
          addErrorToast,
        })
      ) {
        return undefined;
      }

      const name = getDocumentName(file, mimeType);
      const controller = new AbortController();
      controllers.current.set(name, controller);
      setLoading(name, true);
      readDocument({ file, name, mimeType, controller });
      return name;
    },
    [upsertAttachments, addErrorToast, setLoading, readDocument]
  );

  // Keeps the work in step with the chips: a chip the user deleted cancels or deletes its document.
  const handleAfterInput = useCallback(() => {
    const chipNames = new Set(messageEditorController.getPlaceholderNames('document'));
    for (const name of [...controllers.current.keys(), ...unsentDocuments.current.keys()]) {
      if (!chipNames.has(name)) removeDocument(name);
    }
  }, [messageEditorController, removeDocument]);

  const handleSubmitted = useCallback(() => {
    unsentDocuments.current.clear();
    pendingConversation.current = undefined;
    setPendingConversationId(undefined);
  }, []);

  // Leaving the conversation or the agent drops the documents that were not sent.
  const leaveRef = useRef<() => void>(() => {});
  leaveRef.current = () => {
    for (const controller of controllers.current.values()) {
      controller.abort();
    }
    controllers.current.clear();
    for (const name of [...unsentDocuments.current.keys()]) {
      deleteUnsentDocument(name);
    }
    pendingConversation.current = undefined;
    setPendingConversationId(undefined);
    setLoadingDocumentNames(new Set());
  };
  useEffect(() => {
    const leave = leaveRef;
    return () => leave.current();
  }, [conversationId, agentId]);

  return {
    loadingDocumentNames,
    pendingConversationId,
    handlePasteDocument: upsertAttachments ? handlePasteDocument : undefined,
    handleAfterInput,
    handleRemoveDocument: removeDocument,
    handleSubmitted,
  };
};
