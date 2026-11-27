/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { InvestigationRecord, ThreadRef } from '../../../../common/investigations/types';

const STORAGE_PREFIX = 'xpack.cases.investigations.selectedConversation';

const readStored = (recordId: string): string | undefined => {
  try {
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}.${recordId}`) ?? undefined;
  } catch {
    return undefined;
  }
};

const writeStored = (recordId: string, conversationId: string): void => {
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}.${recordId}`, conversationId);
  } catch {
    // The selection is only a convenience; without storage it falls back to the main conversation.
  }
};

export interface SelectedConversation {
  /** The conversation shown: the main one, or the id of a thread. */
  conversationId: string;
  /** Set when a thread is shown. */
  thread: ThreadRef | null;
  select: (conversationId: string) => void;
  selectMain: () => void;
}

/**
 * Which conversation of a record is shown. `requestedId` (a thread's conversation id, for example
 * from an Activity link) selects that thread when it is one of the record's threads. The choice is
 * remembered for the browser session, so the Conversation tab and the side panel's Chat show the
 * same conversation when you collapse or expand.
 */
export const useSelectedConversation = (
  record: InvestigationRecord,
  mainConversationId: string,
  requestedId?: string
): SelectedConversation => {
  const [selectedId, setSelectedId] = useState(
    requestedId ?? readStored(record.id) ?? mainConversationId
  );

  useEffect(() => {
    if (requestedId) {
      setSelectedId(requestedId);
    }
  }, [requestedId]);

  useEffect(() => {
    writeStored(record.id, selectedId);
  }, [record.id, selectedId]);

  const thread = record.threads.find(({ conversation_id: id }) => id === selectedId) ?? null;
  const select = useCallback((conversationId: string) => setSelectedId(conversationId), []);
  const selectMain = useCallback(() => setSelectedId(mainConversationId), [mainConversationId]);

  return {
    conversationId: thread ? thread.conversation_id : mainConversationId,
    thread,
    select,
    selectMain,
  };
};
