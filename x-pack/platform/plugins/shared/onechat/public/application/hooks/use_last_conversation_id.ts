/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { storageKeys } from '../storage_keys';
import { useConversationList } from './use_conversation_list';

interface UseLastConversationIdParams {
  sessionTag?: string;
  agentId?: string;
}

export const useLastConversationId = ({
  sessionTag,
  agentId,
}: UseLastConversationIdParams = {}) => {
  const storageKey = storageKeys.getLastConversationKey(sessionTag, agentId);
  const [storedId, setStoredId] = useLocalStorage<string>(storageKey);

  const { conversations, isLoading } = useConversationList({ agentId });

  const lastConversationId = useMemo(() => {
    if (storedId && conversations?.find((c) => c.id === storedId)) {
      return storedId;
    }

    // Remove the stored ID if the conversation no longer exists
    if (storedId && conversations) {
      setStoredId(undefined);
    }

    return undefined;
  }, [storedId, conversations, setStoredId]);

  return {
    lastConversationId,
    isLoading,
  };
};
