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
  SupportedBinaryMimeType,
} from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { uploadBinary } from './upload_binary';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAgentId } from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { queryKeys } from '../../../query_keys';

export interface UseBinaryUploadParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
  createConversation: (agentId: string) => Promise<{ id: string }>;
}

export interface UseBinaryUploadResult {
  loadingBinaryNames: Set<string>;
  pendingConversationId: string | undefined;
  handlePasteBinary?: (file: File, name: string, mimeType: SupportedBinaryMimeType) => void;
  handleAfterInput: () => void;
  handleRemoveBinary: (name: string) => void;
  /** Tells the hook the files went out with a message, so leaving the screen does not delete them. */
  handleSubmitted: () => void;
}

interface UnsentBinary {
  attachmentId: string;
  conversationId: string;
}

const isBinaryInput = (attachment: ConversationAttachment): boolean =>
  !('items' in attachment) && attachment.type === AttachmentType.binary;

export const useBinaryUpload = ({
  addErrorToast,
  messageEditorController,
  createConversation,
}: UseBinaryUploadParams): UseBinaryUploadResult => {
  const { binaryFilesClient, attachmentsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const agentId = useAgentId();
  const { attachments, conversationId, upsertAttachments, removeAttachment } =
    useConversationContext();
  const [loadingBinaryNames, setLoadingBinaryNames] = useState<Set<string>>(new Set());
  const [pendingConversationId, setPendingConversationId] = useState<string | undefined>();

  // Uploads and reads that are in flight, by file name.
  const controllers = useRef<Map<string, AbortController>>(new Map());
  // Binary files that are read and sit in the input attachments, but are not sent yet.
  const unsentBinaries = useRef<Map<string, UnsentBinary>>(new Map());
  const pendingConversation = useRef<Promise<string> | undefined>();

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const setLoading = useCallback((name: string, isLoading: boolean) => {
    setLoadingBinaryNames((prev) => {
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
    ({ conversationId: cachedConversationId, attachmentId }: UnsentBinary) => {
      queryClient.setQueryData<Conversation | undefined>(
        queryKeys.conversations.byId(cachedConversationId),
        (old) =>
          old && { ...old, attachments: old.attachments?.filter((a) => a.id !== attachmentId) }
      );
    },
    [queryClient]
  );

  // Removes the pill and best-effort deletes the attachment. The file stays in Files (orphan).
  const deleteUnsentBinary = useCallback(
    (name: string) => {
      const unsent = unsentBinaries.current.get(name);
      if (!unsent) return;
      unsentBinaries.current.delete(name);

      const current = attachmentsRef.current ?? [];
      const index = current.findIndex((a) => isBinaryInput(a) && a.id === unsent.attachmentId);
      if (index !== -1) removeAttachment?.(index);

      removeFromConversationCache(unsent);
      attachmentsService.delete({ ...unsent, permanent: true }).catch(() => {});
    },
    [attachmentsService, removeAttachment, removeFromConversationCache]
  );

  // Stops the work and removes everything the file left in the editor and the input attachments.
  const removeBinary = useCallback(
    (name: string) => {
      messageEditorController.removePlaceholderByName(name, 'binary');
      controllers.current.get(name)?.abort();
      controllers.current.delete(name);
      setLoading(name, false);
      deleteUnsentBinary(name);
    },
    [messageEditorController, setLoading, deleteUnsentBinary]
  );

  const readBinary = useCallback(
    async ({
      file,
      name,
      mimeType,
      controller,
    }: {
      file: File;
      name: string;
      mimeType: SupportedBinaryMimeType;
      controller: AbortController;
    }) => {
      if (!upsertAttachments) return;

      let targetConversationId = conversationId;
      if (!targetConversationId) {
        try {
          targetConversationId = await ensurePendingConversation();
        } catch {
          // The create mutation shows its own error toast.
          removeBinary(name);
          return;
        }
      }
      if (controller.signal.aborted) return;

      const result = await uploadBinary({
        file,
        name,
        mimeType,
        conversationId: targetConversationId,
        binaryFilesClient,
        attachmentsService,
        signal: controller.signal,
      });

      // The file was removed meanwhile, and its name may belong to a new upload by now.
      if (controllers.current.get(name) !== controller) return;
      if (result.status === 'aborted') return;

      controllers.current.delete(name);
      setLoading(name, false);

      if (result.status === 'failed') {
        addErrorToast({ title: result.message });
        messageEditorController.removePlaceholderByName(name, 'binary');
        return;
      }

      const { attachment, fileId } = result;
      unsentBinaries.current.set(name, {
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
        { id: attachment.id, type: AttachmentType.binary, origin: fileId, description: name },
      ]);
    },
    [
      upsertAttachments,
      conversationId,
      ensurePendingConversation,
      removeBinary,
      binaryFilesClient,
      attachmentsService,
      setLoading,
      addErrorToast,
      messageEditorController,
      queryClient,
    ]
  );

  const handlePasteBinary = useCallback(
    (file: File, name: string, mimeType: SupportedBinaryMimeType) => {
      if (!upsertAttachments) return;
      const controller = new AbortController();
      controllers.current.set(name, controller);
      setLoading(name, true);
      readBinary({ file, name, mimeType, controller });
    },
    [upsertAttachments, setLoading, readBinary]
  );

  // Keeps the work in step with the chips: a chip the user deleted cancels or deletes its file.
  const handleAfterInput = useCallback(() => {
    const chipNames = new Set(messageEditorController.getPlaceholderNames('binary'));
    for (const name of [...controllers.current.keys(), ...unsentBinaries.current.keys()]) {
      if (!chipNames.has(name)) removeBinary(name);
    }
  }, [messageEditorController, removeBinary]);

  const handleSubmitted = useCallback(() => {
    unsentBinaries.current.clear();
    pendingConversation.current = undefined;
    setPendingConversationId(undefined);
  }, []);

  // Leaving the conversation or the agent drops the files that were not sent.
  const leaveRef = useRef<() => void>(() => {});
  leaveRef.current = () => {
    for (const controller of controllers.current.values()) {
      controller.abort();
    }
    controllers.current.clear();
    for (const name of [...unsentBinaries.current.keys()]) {
      deleteUnsentBinary(name);
    }
    pendingConversation.current = undefined;
    setPendingConversationId(undefined);
    setLoadingBinaryNames(new Set());
  };
  useEffect(() => {
    const leave = leaveRef;
    return () => leave.current();
  }, [conversationId, agentId]);

  return {
    loadingBinaryNames,
    pendingConversationId,
    handlePasteBinary: upsertAttachments ? handlePasteBinary : undefined,
    handleAfterInput,
    handleRemoveBinary: removeBinary,
    handleSubmitted,
  };
};
