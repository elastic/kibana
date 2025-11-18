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
  const context = useConversationContext();
  const conversationId = useConversationId();
  const { sendMessage } = useSendMessage();
  const hasSentInitialMessage = useRef(false);

  const initialMessage = context.initialMessage;
  const isNewConversation = !conversationId;

  useEffect(() => {
    if (initialMessage && isNewConversation && !hasSentInitialMessage.current) {
      hasSentInitialMessage.current = true;
      sendMessage({ message: initialMessage });
    }
  }, [initialMessage, isNewConversation, sendMessage]);

  return {
    hasSentInitialMessage: hasSentInitialMessage.current,
  };
};
