/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import produce from 'immer';
import { useState } from 'react';
import { newConversationId } from '../../utils/new_conversation';

interface PendingMessageState {
  pendingMessage?: string;
}

export const usePendingMessageState = ({ conversationId }: { conversationId?: string }) => {
  const [conversationIdToPendingMessageState, setConversationIdToPendingMessageState] = useState<
    Record<string, PendingMessageState>
  >({});

  const id = conversationId ?? newConversationId;

  const updateState = (updater: (c: PendingMessageState) => void) => {
    setConversationIdToPendingMessageState(
      produce((draft) => {
        draft[id] ??= {};
        updater(draft[id]);
      })
    );
  };

  const pendingMessageState = conversationIdToPendingMessageState[id] ?? {};

  return {
    pendingMessageState,
    setPendingMessage: (pendingMessage: string) => {
      updateState((state) => {
        state.pendingMessage = pendingMessage;
      });
    },
    removePendingMessage: () => {
      updateState((state) => {
        delete state.pendingMessage;
      });
    },
  };
};
