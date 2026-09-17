/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversationStream } from './use_conversation_stream';
import { useNavigation } from './use_navigation';
import { useToasts } from './use_toasts';
import { appPaths } from '../utils/app_paths';

/**
 * Single source of truth for "send this message". A new conversation is created on the server
 * first, so it exists, is cached and is in the sidebar before anything streams into it; then the
 * user is moved to it, by URL in the routed app or by state in the embeddable.
 */
export const useSubmitMessage = () => {
  const conversationId = useConversationId();
  const { sendMessage } = useConversationStream();
  const { isEmbeddedContext, setConversationId, agentId } = useConversationContext();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addErrorToast } = useToasts();

  return useCallback(
    async (message: string) => {
      if (conversationId) {
        sendMessage({ message, conversationId });
        return;
      }
      if (!agentId) {
        throw new Error('agentId is required to start a conversation');
      }

      let created;
      try {
        created = await conversationsService.create({ agentId });
      } catch (error) {
        addErrorToast({ title: formatAgentBuilderErrorMessage(error) });
        return;
      }
      queryClient.setQueryData(queryKeys.conversations.byId(created.id), created);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });

      sendMessage({ message, conversationId: created.id });

      if (isEmbeddedContext) {
        setConversationId?.(created.id);
      } else {
        navigateToAgentBuilderUrl(
          appPaths.agent.conversations.byId({ agentId, conversationId: created.id })
        );
      }
    },
    [
      conversationId,
      sendMessage,
      agentId,
      conversationsService,
      addErrorToast,
      queryClient,
      isEmbeddedContext,
      setConversationId,
      navigateToAgentBuilderUrl,
    ]
  );
};
