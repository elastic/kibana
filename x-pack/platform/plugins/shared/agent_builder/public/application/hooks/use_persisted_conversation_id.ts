/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import useLocalStorage from 'react-use/lib/useLocalStorage';
import { storageKeys } from '../storage_keys';

interface UsePersistedConversationIdParams {
  sessionTag?: string;
  agentId?: string;
}

export const usePersistedConversationId = ({
  sessionTag,
  agentId,
}: UsePersistedConversationIdParams) => {
  const storageKey = storageKeys.getLastConversationKey(sessionTag, agentId);
  const [persistedConversationId, setPersistedConversationId, clearPersistedConversationId] =
    useLocalStorage<string>(storageKey);

  const updatePersistedConversationId = (id?: string) => {
    if (id) {
      setPersistedConversationId(id);
    } else {
      clearPersistedConversationId();
    }
  };

  return {
    persistedConversationId,
    updatePersistedConversationId,
  };
};
