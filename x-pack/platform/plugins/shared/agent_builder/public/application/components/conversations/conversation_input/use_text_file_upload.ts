/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToastInput } from '@kbn/core/public';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type { MessageEditorController } from './message_editor/use_message_editor';
import { getTextFileName } from './file_type';
import { readTextFile } from './read_text_file';
import { useConversationContext } from '../../../context/conversation/conversation_context';

export interface UseTextFileUploadParams {
  addErrorToast: (input: ToastInput) => void;
  messageEditorController: MessageEditorController;
}

export interface UseTextFileUploadResult {
  loadingTextFileNames: Set<string>;
  handlePasteTextFile?: (file: File, name: string) => void;
  handleAfterInput: () => void;
  handleRemoveTextFile: (name: string) => void;
}

export const useTextFileUpload = ({
  addErrorToast,
  messageEditorController,
}: UseTextFileUploadParams): UseTextFileUploadResult => {
  const { attachments, conversationId, upsertAttachments, removeAttachments } =
    useConversationContext();
  const [loadingTextFileNames, setLoadingTextFileNames] = useState<Set<string>>(new Set());
  const readControllers = useRef<Map<string, AbortController>>(new Map());
  // Names of the text files this hook added, so text attachments from other features stay.
  const addedNames = useRef<Set<string>>(new Set());

  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  const setLoading = useCallback((name: string, isLoading: boolean) => {
    setLoadingTextFileNames((prev) => {
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

  // Drops the results of reads still running when the user leaves this conversation.
  // A read can't be stopped (`file.arrayBuffer()` has no signal), so the controller only marks it as stale.
  useEffect(() => {
    const controllers = readControllers.current;
    return () => {
      for (const controller of controllers.values()) {
        controller.abort();
      }
      controllers.clear();
      setLoadingTextFileNames(new Set());
    };
  }, [conversationId]);

  const stopReading = useCallback(
    (name: string) => {
      readControllers.current.get(name)?.abort();
      readControllers.current.delete(name);
      setLoading(name, false);
    },
    [setLoading]
  );

  const removeAttachmentsByName = useCallback(
    (names: readonly string[]) => {
      if (names.length === 0) return;
      for (const name of names) addedNames.current.delete(name);
      const toRemove = (attachmentsRef.current ?? []).filter((attachment) => {
        if ('items' in attachment) return false;
        const name = getTextFileName(attachment);
        return name !== undefined && names.includes(name);
      });
      if (toRemove.length > 0) removeAttachments?.(toRemove);
    },
    [removeAttachments]
  );

  const handlePasteTextFile = useCallback(
    (file: File, name: string) => {
      if (!upsertAttachments) return;
      const controller = new AbortController();
      readControllers.current.set(name, controller);
      setLoading(name, true);

      readTextFile(file).then((result) => {
        // The chip was deleted meanwhile, and its name may belong to a new read by now.
        if (readControllers.current.get(name) !== controller) return;
        readControllers.current.delete(name);
        setLoading(name, false);

        if (result.status === 'failed') {
          addErrorToast({ title: result.message, text: name });
          messageEditorController.removePlaceholderByName(name, 'text');
          return;
        }
        addedNames.current.add(name);
        upsertAttachments([{ type: AttachmentType.text, data: { content: result.content, name } }]);
      });
    },
    [upsertAttachments, setLoading, addErrorToast, messageEditorController]
  );

  // Keeps the attachments in step with the chips: a chip the user deleted drops its text file.
  const handleAfterInput = useCallback(() => {
    const chipNames = new Set(messageEditorController.getPlaceholderNames('text'));
    for (const name of [...readControllers.current.keys()]) {
      if (!chipNames.has(name)) stopReading(name);
    }
    removeAttachmentsByName([...addedNames.current].filter((name) => !chipNames.has(name)));
  }, [messageEditorController, stopReading, removeAttachmentsByName]);

  const handleRemoveTextFile = useCallback(
    (name: string) => {
      messageEditorController.removePlaceholderByName(name, 'text');
      stopReading(name);
      removeAttachmentsByName([name]);
    },
    [messageEditorController, stopReading, removeAttachmentsByName]
  );

  return {
    loadingTextFileNames,
    handlePasteTextFile: upsertAttachments ? handlePasteTextFile : undefined,
    handleAfterInput,
    handleRemoveTextFile,
  };
};
