/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useSendMessage } from '../context/send_message/send_message_context';
import { useNavigation } from './use_navigation';
import { appPaths } from '../utils/app_paths';

/**
 * Single source of truth for "send this message". The conversationId is always passed explicitly
 * to the mutation — for an existing conversation it's just the current id, for a new conversation
 * it's a freshly minted UUID. The mutation never reads conversationId from context closure.
 *
 * For new conversations we also need to transition the user to the new id — that means a URL
 * navigation in the routed app, or an internal state update in the embeddable. We branch on
 * `isEmbeddedContext` rather than asking each provider to expose its own helper.
 */
export const useSubmitMessage = () => {
  const conversationId = useConversationId();
  const { sendMessage } = useSendMessage();
  const { isEmbeddedContext, setConversationId, agentId } = useConversationContext();
  const { navigateToAgentBuilderUrl } = useNavigation();

  return useCallback(
    (message: string) => {
      const isNew = !conversationId;
      const targetId = conversationId ?? uuidv4();

      sendMessage({ message, conversationId: targetId });

      if (!isNew) return;

      // navigate only for new conversations, not for continued conversations
      if (isEmbeddedContext) {
        setConversationId?.(targetId);
      } else if (agentId) {
        navigateToAgentBuilderUrl(
          appPaths.agent.conversations.byId({ agentId, conversationId: targetId })
        );
      }
    },
    [
      conversationId,
      sendMessage,
      isEmbeddedContext,
      setConversationId,
      agentId,
      navigateToAgentBuilderUrl,
    ]
  );
};
