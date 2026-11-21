/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { InvestigationRecord, ThreadRef } from '../../../../common/investigations/types';

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
 * from an Activity link) selects that thread when it is one of the record's threads.
 */
export const useSelectedConversation = (
  record: InvestigationRecord,
  mainConversationId: string,
  requestedId?: string
): SelectedConversation => {
  const [selectedId, setSelectedId] = useState(requestedId ?? mainConversationId);

  useEffect(() => {
    if (requestedId) {
      setSelectedId(requestedId);
    }
  }, [requestedId]);

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
