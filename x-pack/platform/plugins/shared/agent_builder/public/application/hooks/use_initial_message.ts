/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentId } from './use_conversation';
import { useValidateAgentId } from './agents/use_validate_agent_id';
import { useAgentBuilderAgents } from './agents/use_agents';
import { useAgentBuilderAgentById } from './agents/use_agent_by_id';
import { useAgentModel } from './agents/use_agent_model';
import { useSubmitMessage } from './use_submit_message';

/**
 * Auto-send an initial message when one is provided via location state (deep-link ->
 * `/conversations/new`) or via embeddable props (host opens with `initialMessage` +
 * `autoSendInitialMessage: true`). Only fires when there is no `conversationId` yet — a refresh
 * on `/conversations/<uuid>` shouldn't replay the original message.
 *
 * Gated on `agentExists` so the send doesn't fire before the agents list has loaded (or against
 * an agent that no longer exists). `agentId` may point at a hidden agent (e.g. an internal setup
 * agent opened via deep link) which is excluded from the visible agents list, so a missing list
 * match falls back to a direct by-ID fetch before treating the agent as deleted — mirroring
 * `conversation_input.tsx`'s `agentExists` check.
 *
 * Routes through `useSubmitMessage` so deep-link sends take the same UUID-generation +
 * navigation path as a user-typed submit.
 */
export const useSendPredefinedInitialMessage = () => {
  const { initialMessage, autoSendInitialMessage, resetInitialMessage } = useConversationContext();
  const conversationId = useConversationId();
  const agentId = useAgentId();
  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);
  const { isFetched: isAgentsListFetched } = useAgentBuilderAgents();
  const { agent: agentById } = useAgentBuilderAgentById(
    !isAgentIdValid && isAgentsListFetched && agentId ? agentId : undefined
  );
  const agentExists = isAgentIdValid || Boolean(agentById);
  const { isLoading: isAgentModelLoading } = useAgentModel(agentId);
  const { submitMessage } = useSubmitMessage();
  const isNewConversation = !conversationId;

  useEffect(() => {
    if (
      initialMessage &&
      isNewConversation &&
      autoSendInitialMessage &&
      agentExists &&
      !isAgentModelLoading
    ) {
      submitMessage(initialMessage);
      resetInitialMessage?.();
    }
  }, [
    initialMessage,
    autoSendInitialMessage,
    isNewConversation,
    agentExists,
    isAgentModelLoading,
    submitMessage,
    resetInitialMessage,
  ]);

  return null;
};
