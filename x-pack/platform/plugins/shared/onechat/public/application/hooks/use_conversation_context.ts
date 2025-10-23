/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useConversationContext } from '../context/conversation_context';
import { newConversationId } from '../utils/new_conversation';

export const useConversationIdFromContext = () => {
  const { conversationId } = useConversationContext();

  const processedConversationId = useMemo(() => {
    return conversationId === newConversationId ? undefined : conversationId;
  }, [conversationId]);

  return processedConversationId;
};

export const useShouldStickToBottomFromContext = () => {
  const { shouldStickToBottom } = useConversationContext();
  return shouldStickToBottom ?? true;
};
