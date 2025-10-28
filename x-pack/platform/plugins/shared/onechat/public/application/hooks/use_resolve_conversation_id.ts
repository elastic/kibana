/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLastConversationId } from './use_last_conversation_id';

interface UseResolveConversationIdParams {
  newConversation?: boolean;
  conversationId?: string;
  sessionTag?: string;
  agentId?: string;
}

export const useResolveConversationId = ({
  newConversation,
  conversationId,
  sessionTag,
  agentId,
}: UseResolveConversationIdParams) => {
  const { lastConversationId, isLoading } = useLastConversationId({
    sessionTag,
    agentId,
  });

  if (newConversation === true) {
    return {
      resolvedConversationId: undefined,
      isLoading: false,
    };
  }

  if (conversationId) {
    return {
      resolvedConversationId: conversationId,
      isLoading: false,
    };
  }

  return {
    resolvedConversationId: lastConversationId,
    isLoading,
  };
};
