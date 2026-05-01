/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import produce from 'immer';
import { useState } from 'react';

interface PendingMessageState {
  pendingMessage?: string;
}

export const usePendingMessageState = ({ conversationId }: { conversationId?: string }) => {
  const [conversationIdToPendingMessageState, setConversationIdToPendingMessageState] = useState<
    Record<string, PendingMessageState>
  >({});

  const updateStateFor = (id: string | undefined, updater: (c: PendingMessageState) => void) => {
    if (!id) return;
    setConversationIdToPendingMessageState(
      produce((draft) => {
        draft[id] ??= {};
        updater(draft[id]);
      })
    );
  };

  const pendingMessageState = conversationId
    ? conversationIdToPendingMessageState[conversationId] ?? {}
    : {};

  return {
    pendingMessageState,
    setPendingMessage: (pendingMessage: string, id: string | undefined = conversationId) => {
      updateStateFor(id, (state) => {
        state.pendingMessage = pendingMessage;
      });
    },
    removePendingMessage: (id: string | undefined = conversationId) => {
      updateStateFor(id, (state) => {
        delete state.pendingMessage;
      });
    },
  };
};
