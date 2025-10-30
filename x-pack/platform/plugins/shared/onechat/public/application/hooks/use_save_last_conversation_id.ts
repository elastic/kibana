/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { storageKeys } from '../storage_keys';

interface UseSaveLastConversationIdParams {
  conversationId?: string;
  sessionTag?: string;
  agentId?: string;
}

export const useSaveLastConversationId = ({
  conversationId,
  sessionTag,
  agentId,
}: UseSaveLastConversationIdParams) => {
  const storageKey = storageKeys.getLastConversationKey(sessionTag, agentId);
  const [, setStoredId] = useLocalStorage<string>(storageKey);

  const lastSavedId = useRef<string | undefined>();

  const saveConversationId = useCallback(
    (id: string) => {
      if (id && id !== lastSavedId.current) {
        setStoredId(id);
        lastSavedId.current = id;
      }
    },
    [setStoredId]
  );

  useEffect(() => {
    if (conversationId) {
      saveConversationId(conversationId);
    }
  }, [conversationId, saveConversationId]);

  return {
    saveConversationId,
  };
};
