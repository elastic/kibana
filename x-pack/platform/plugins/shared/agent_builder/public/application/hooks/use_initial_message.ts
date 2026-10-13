/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useAgentId } from './use_conversation';
import { useValidateAgentId } from './agents/use_validate_agent_id';
import { useAgentModel } from './agents/use_agent_model';
import { useSubmitMessage } from './use_submit_message';

/**
 * Auto-send an initial message when one is provided via location state (workplace_ai_app
 * deep-link -> `/conversations/new`) or via embeddable props (host opens with `initialMessage` +
 * `autoSendInitialMessage: true`). Fires regardless of whether a prior conversation exists —
 * callers that re-open the sidebar on an existing session (e.g. "Create with AI Agent" after
 * sources change) intentionally want the message sent even though a conversation is already loaded.
 * `resetInitialMessage` clears both fields after the send, so re-renders don't replay it.
 *
 * Gated on `isAgentIdValid` so the send doesn't fire before the agents list has loaded (or against
 * an agent that no longer exists)
 *
 * Routes through `useSubmitMessage` so deep-link sends take the same UUID-generation +
 * navigation path as a user-typed submit.
 */
export const useSendPredefinedInitialMessage = () => {
  const { initialMessage, autoSendInitialMessage, resetInitialMessage } = useConversationContext();
  const agentId = useAgentId();
  const validateAgentId = useValidateAgentId();
  const isAgentIdValid = validateAgentId(agentId);
  const { isLoading: isAgentModelLoading } = useAgentModel(agentId);
  const { submitMessage } = useSubmitMessage();
  useEffect(() => {
    if (initialMessage && autoSendInitialMessage && isAgentIdValid && !isAgentModelLoading) {
      submitMessage(initialMessage);
      resetInitialMessage?.();
    }
  }, [
    initialMessage,
    autoSendInitialMessage,
    isAgentIdValid,
    isAgentModelLoading,
    submitMessage,
    resetInitialMessage,
  ]);

  return null;
};
