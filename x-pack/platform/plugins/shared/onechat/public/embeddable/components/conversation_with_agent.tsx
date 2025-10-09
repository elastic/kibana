/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { Conversation } from '../../application/components/conversations/conversation';
import { AutoSubmitMessage } from '../../application/components/conversations/auto_submit_message';
import { useValidateAgentId } from '../../application/hooks/agents/use_validate_agent_id';
import { useConversationActions } from '../../application/hooks/use_conversation_actions';
import { useConversationId } from '../../application/hooks/use_conversation_id';

interface ConversationWithAgentProps {
  /**
   * Requested agent ID - will fall back to default if not found
   */
  agentId?: string;
}

/**
 * Wrapper component that validates and sets the agent ID before rendering the conversation.
 * This component must be used within all necessary providers (QueryClient, OnechatServices, etc.)
 */
export const ConversationWithAgent: React.FC<ConversationWithAgentProps> = ({
  agentId: requestedAgentId,
}) => {
  const validateAgentId = useValidateAgentId();
  const { setAgentId } = useConversationActions();
  const conversationId = useConversationId();

  // Validate the requested agent ID and fall back to default if not valid
  const validatedAgentId = useMemo(() => {
    if (requestedAgentId && validateAgentId(requestedAgentId)) {
      return requestedAgentId;
    }
    // Fall back to default agent if requested agent doesn't exist
    return oneChatDefaultAgentId;
  }, [requestedAgentId, validateAgentId]);

  // Set the agent ID for new conversations
  useEffect(() => {
    // Only set agent ID for new conversations (no existing conversationId)
    if (!conversationId && validatedAgentId) {
      setAgentId(validatedAgentId);
    }
  }, [conversationId, validatedAgentId, setAgentId]);

  return (
    <>
      <AutoSubmitMessage />
      <Conversation />
    </>
  );
};

