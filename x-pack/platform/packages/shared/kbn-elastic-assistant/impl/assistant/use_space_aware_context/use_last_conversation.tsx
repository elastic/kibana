/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { BehaviorSubject } from 'rxjs';
import {
  DEFAULT_ASSISTANT_NAMESPACE,
  LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY,
} from '../../assistant_context/constants';
import { WELCOME_CONVERSATION_TITLE } from '../use_conversation/translations';
export interface LastConversation {
  id: string;
  title?: string;
}

export const localStorageLastConversationIdSubject$ = new BehaviorSubject<string | null>(null);

export const useAssistantLastConversation = ({
  nameSpace = DEFAULT_ASSISTANT_NAMESPACE,
  spaceId,
}: {
  nameSpace?: string;
  spaceId: string;
}): {
  getLastConversationId: (conversationId?: string) => string;
  setLastConversationId: (conversationId?: string) => void;
} => {
  // Legacy fallback: used only if the new storage value is not yet set
  const [localStorageLastConversationId, setLocalStorageLastConversationId] =
    useLocalStorage<string>(`${nameSpace}.${LAST_CONVERSATION_ID_LOCAL_STORAGE_KEY}.${spaceId}`);

  // Sync BehaviorSubject when localStorage changes
  useEffect(() => {
    if (localStorageLastConversationIdSubject$.getValue() !== localStorageLastConversationId) {
      localStorageLastConversationIdSubject$.next(localStorageLastConversationId || null);
    }
  }, [localStorageLastConversationId]);

  const getLastConversationId = useCallback(
    // if a conversationId has been provided, use that
    // if not, check local storage
    // last resort, go to welcome conversation
    (conversationId?: string) => {
      return (
        conversationId ??
        localStorageLastConversationIdSubject$.getValue() ??
        WELCOME_CONVERSATION_TITLE
      );
    },
    []
  );

  const setLastConversationId = useCallback(
    (conversationId?: string) => {
      setLocalStorageLastConversationId(conversationId);
      localStorageLastConversationIdSubject$.next(conversationId ?? null);
    },
    [setLocalStorageLastConversationId]
  );

  return useMemo(
    () => ({ getLastConversationId, setLastConversationId }),
    [getLastConversationId, setLastConversationId]
  );
};
