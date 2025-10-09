/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { newConversationId } from '../utils/new_conversation';
import { useConversationIdFromContext } from '../context/conversation_id_context';

export const useConversationId = () => {
  // Try to get conversationId from context first (for embeddable mode)
  const contextValue = useConversationIdFromContext();

  // Fallback to router params (for standalone app mode)
  const { conversationId: conversationIdParam } = useParams<{ conversationId?: string }>();

  const conversationId = useMemo(() => {
    // If context is available, use it (embeddable mode)
    if (contextValue !== null) {
      return contextValue.conversationId;
    }

    // Otherwise use router params (standalone app mode)
    return conversationIdParam === newConversationId ? undefined : conversationIdParam;
  }, [contextValue, conversationIdParam]);

  return conversationId;
};
