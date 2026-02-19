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
import { useAgentId } from './use_conversation';
import { useValidateAgentId } from './agents/use_validate_agent_id';

export const useSendPredefinedInitialMessage = () => {
  const { initialMessage, autoSendInitialMessage, resetInitialMessage } = useConversationContext();
  const conversationId = useConversationId();
  const { sendMessage } = useSendMessage();
  const agentId = useAgentId();
  const validateAgentId = useValidateAgentId();

  const isNewConversation = !conversationId;
  const isAgentIdValid = validateAgentId(agentId);

  useEffect(() => {
    // Only auto-send if we have a valid agent ID to prevent race conditions
    if (initialMessage && isNewConversation && autoSendInitialMessage && isAgentIdValid) {
      sendMessage({ message: initialMessage });
      resetInitialMessage?.();
    }
  }, [
    initialMessage,
    autoSendInitialMessage,
    isNewConversation,
    isAgentIdValid,
    agentId,
    sendMessage,
    resetInitialMessage,
  ]);

  return null;
};
