/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useSendMessage } from '../context/send_message/send_message_context';

export const useSendPredefinedInitialMessage = () => {
  const { initialMessage, autoSendInitialMessage, resetInitialMessage } = useConversationContext();
  const conversationId = useConversationId();
  const { sendMessage } = useSendMessage();
  const lastSentMessageRef = useRef<string | undefined>(undefined);

  const isNewConversation = !conversationId;

  useEffect(() => {
    if (!initialMessage || !autoSendInitialMessage) {
      return;
    }

    const isNewMessage = initialMessage !== lastSentMessageRef.current;
    const shouldSend = isNewConversation || isNewMessage;

    if (shouldSend) {
      lastSentMessageRef.current = initialMessage;
      sendMessage({ message: initialMessage });
      resetInitialMessage?.();
    }
  }, [initialMessage, autoSendInitialMessage, isNewConversation, sendMessage, resetInitialMessage]);

  return null;
};
