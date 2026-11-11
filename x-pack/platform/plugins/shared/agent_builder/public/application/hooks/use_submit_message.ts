/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useAgentId } from './use_conversation';
import { useConversationStream } from './use_conversation_stream';
import { useCreateConversation } from './use_create_conversation';
import { useNavigation } from './use_navigation';
import { appPaths } from '../utils/app_paths';

interface SubmitMessageOptions {
  conversationId?: string;
}

/**
 * Single source of truth for "send this message". A new conversation is created on the server
 * first, so it exists, is cached and is in the sidebar before anything streams into it; then the
 * user is moved to it, by URL in the routed app or by state in the embeddable.
 * `isCreatingConversation` is true while that request is in flight, so the input can hold submits.
 * A new conversation that already exists (made earlier by `createConversation`, for example when
 * a document was pasted) is passed as `conversationId`, so it is reused instead of created again.
 */
export const useSubmitMessage = () => {
  const conversationId = useConversationId();
  const { sendMessage } = useConversationStream();
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const agentId = useAgentId();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { createConversation, isCreatingConversation } = useCreateConversation();

  const submitMessage = useCallback(
    async (
      message: string,
      { conversationId: pendingConversationId }: SubmitMessageOptions = {}
    ) => {
      if (conversationId) {
        sendMessage({ message, conversationId });
        return;
      }
      if (!agentId) {
        throw new Error('agentId is required to start a conversation');
      }

      let newConversationId = pendingConversationId;
      if (!newConversationId) {
        try {
          ({ id: newConversationId } = await createConversation(agentId));
        } catch {
          return;
        }
      }

      sendMessage({ message, conversationId: newConversationId });

      if (isEmbeddedContext) {
        setConversationId?.(newConversationId);
      } else {
        navigateToAgentBuilderUrl(
          appPaths.agent.conversations.byId({ agentId, conversationId: newConversationId })
        );
      }
    },
    [
      conversationId,
      sendMessage,
      agentId,
      createConversation,
      isEmbeddedContext,
      setConversationId,
      navigateToAgentBuilderUrl,
    ]
  );

  return { submitMessage, isCreatingConversation };
};
