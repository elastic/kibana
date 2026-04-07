/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useSendMessage } from '../context/send_message/send_message_context';
import { useConversation } from './use_conversation';

export const useSendPredefinedInitialMessage = () => {
  const { initialMessage, autoSendInitialMessage, resetInitialMessage } = useConversationContext();
  const conversationId = useConversationId();
  const { sendMessage } = useSendMessage();
  const { conversation, isLoading } = useConversation();

  const hasRounds = (conversation?.rounds?.length ?? 0) > 0;
  // Treat as new if: (a) no conversationId yet (brand-new conversation), or
  // (b) a pre-seeded empty conversation has finished loading and has no rounds.
  // This ensures agent-spawned conversations (pre-created server-side) still auto-send
  // their initial message while streaming correctly via the optimistic-round path.
  const isNewConversation = !conversationId || (!isLoading && !hasRounds);

  useEffect(() => {
    if (initialMessage && isNewConversation && autoSendInitialMessage) {
      sendMessage({ message: initialMessage });
      resetInitialMessage?.();
    }
  }, [initialMessage, autoSendInitialMessage, isNewConversation, sendMessage, resetInitialMessage]);

  return null;
};
