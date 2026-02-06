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

export const useSendPredefinedInitialMessage = () => {
  const { initialMessage, autoSendInitialMessage, resetInitialMessage } = useConversationContext();
  const conversationId = useConversationId();
  const { sendMessage } = useSendMessage();

  const isNewConversation = !conversationId;

  useEffect(() => {
    if (initialMessage && isNewConversation && autoSendInitialMessage) {
      sendMessage({ message: initialMessage });
      resetInitialMessage?.();
    }
  }, [initialMessage, autoSendInitialMessage, isNewConversation, sendMessage, resetInitialMessage]);

  return null;
};
