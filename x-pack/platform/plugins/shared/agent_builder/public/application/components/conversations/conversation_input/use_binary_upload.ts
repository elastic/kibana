/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import useSet from 'react-use/lib/useSet';
import type { ToastInput } from '@kbn/core/public';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { SupportedBinaryMimeType } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { uploadBinary } from './upload_binary';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useAgentId } from '../../../hooks/use_conversation';
import { useConversationContext } from '../../../context/conversation/conversation_context';

export interface UseBinaryUploadParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
}

export interface UseBinaryUploadResult {
  loadingBinaryNames: Set<string>;
  handlePasteBinary?: (file: File, name: string, mimeType: SupportedBinaryMimeType) => void;
  handleAfterInput: () => void;
  handleRemoveBinary: (name: string) => void;
}

/** Uploads a pasted PDF to Files. The message carries only the file id; the server reads the file on Send. */
export const useBinaryUpload = ({
  addErrorToast,
  messageEditorController,
}: UseBinaryUploadParams): UseBinaryUploadResult => {
  const { binaryFilesClient } = useAgentBuilderServices();
  const agentId = useAgentId();
  const { attachments, conversationId, upsertAttachments, removeAttachments } =
    useConversationContext();
  const [
    loadingBinaryNames,
    { add: addLoadingName, remove: removeLoadingName, clear: clearLoadingNames },
  ] = useSet<string>();
  // Uploads in flight, by file name.
  const controllers = useRef<Map<string, AbortController>>(new Map());
  // Names of the PDFs this hook added, so binary attachments from other features stay.
  const addedNames = useRef<Set<string>>(new Set());

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  // Leaving the conversation or the agent stops the uploads. Uploaded files stay in Files.
  useEffect(() => {
    const inFlight = controllers.current;
    return () => {
      for (const controller of inFlight.values()) {
        controller.abort();
      }
      inFlight.clear();
      clearLoadingNames();
    };
  }, [conversationId, agentId, clearLoadingNames]);

  const stopUpload = useCallback(
    (name: string) => {
      controllers.current.get(name)?.abort();
      controllers.current.delete(name);
      removeLoadingName(name);
    },
    [removeLoadingName]
  );

  const removeAttachmentsByName = useCallback(
    (names: readonly string[]) => {
      if (names.length === 0) return;
      for (const name of names) addedNames.current.delete(name);
      const toRemove = (attachmentsRef.current ?? []).filter(
        (attachment) =>
          !('items' in attachment) &&
          attachment.type === AttachmentType.binary &&
          attachment.description !== undefined &&
          names.includes(attachment.description)
      );
      if (toRemove.length > 0) removeAttachments?.(toRemove);
    },
    [removeAttachments]
  );

  const handlePasteBinary = useCallback(
    (file: File, name: string, mimeType: SupportedBinaryMimeType) => {
      if (!upsertAttachments) return;
      const controller = new AbortController();
      controllers.current.set(name, controller);
      addLoadingName(name);

      uploadBinary({ file, name, mimeType, binaryFilesClient, signal: controller.signal }).then(
        (result) => {
          // The chip was deleted meanwhile, and its name may belong to a new upload by now.
          if (controllers.current.get(name) !== controller) return;
          if (result.status === 'aborted') return;
          controllers.current.delete(name);
          removeLoadingName(name);

          if (result.status === 'failed') {
            addErrorToast({ title: result.message, text: name });
            messageEditorController.removePlaceholderByName(name, 'binary');
            return;
          }
          addedNames.current.add(name);
          upsertAttachments([
            { type: AttachmentType.binary, origin: result.fileId, description: name },
          ]);
        }
      );
    },
    [
      upsertAttachments,
      addLoadingName,
      binaryFilesClient,
      removeLoadingName,
      addErrorToast,
      messageEditorController,
    ]
  );

  // Keeps the work in step with the chips: a chip the user deleted drops its upload or its attachment.
  const handleAfterInput = useCallback(() => {
    const chipNames = new Set(messageEditorController.getPlaceholderNames('binary'));
    for (const name of [...controllers.current.keys()]) {
      if (!chipNames.has(name)) stopUpload(name);
    }
    removeAttachmentsByName([...addedNames.current].filter((name) => !chipNames.has(name)));
  }, [messageEditorController, stopUpload, removeAttachmentsByName]);

  const handleRemoveBinary = useCallback(
    (name: string) => {
      messageEditorController.removePlaceholderByName(name, 'binary');
      stopUpload(name);
      removeAttachmentsByName([name]);
    },
    [messageEditorController, stopUpload, removeAttachmentsByName]
  );

  return {
    loadingBinaryNames,
    handlePasteBinary: upsertAttachments ? handlePasteBinary : undefined,
    handleAfterInput,
    handleRemoveBinary,
  };
};
