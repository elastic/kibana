/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useIsMutating, useMutation, useQueryClient } from '@kbn/react-query';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { mutationKeys } from '../mutation_keys';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useAgentId } from './use_conversation';
import { useConversationStream } from './use_conversation_stream';
import { useNavigation } from './use_navigation';
import { useToasts } from './use_toasts';
import { appPaths } from '../utils/app_paths';

/**
 * Single source of truth for "send this message". A new conversation is created on the server
 * first, so it exists, is cached and is in the sidebar before anything streams into it; then the
 * user is moved to it, by URL in the routed app or by state in the embeddable.
 * `isCreatingConversation` is true while any request creating a conversation is in flight, from this
 * hook or another one, so the input and the conversation starters hold submits for each other.
 */
export const useSubmitMessage = () => {
  const conversationId = useConversationId();
  const { sendMessage } = useConversationStream();
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const agentId = useAgentId();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addErrorToast } = useToasts();

  const { mutateAsync: createConversation } = useMutation({
    mutationKey: mutationKeys.createConversation,
    mutationFn: (id: string) => conversationsService.create({ agentId: id }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.conversations.byId(created.id), created);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
    },
    onError: (error) => addErrorToast({ title: formatAgentBuilderErrorMessage(error) }),
  });
  const isCreatingConversation =
    useIsMutating({ mutationKey: mutationKeys.createConversation }) > 0;

  const submitMessage = useCallback(
    async (
      message: string,
      { onConversationCreated }: { onConversationCreated?: (conversationId: string) => void } = {}
    ) => {
      if (conversationId) {
        sendMessage({ message, conversationId });
        return;
      }
      if (!agentId) {
        throw new Error('agentId is required to start a conversation');
      }

      if (queryClient.isMutating({ mutationKey: mutationKeys.createConversation }) > 0) {
        return;
      }

      let created;
      try {
        created = await createConversation(agentId);
      } catch {
        return;
      }

      onConversationCreated?.(created.id);
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
      queryClient,
      createConversation,
      isEmbeddedContext,
      setConversationId,
      navigateToAgentBuilderUrl,
    ]
  );

  return { submitMessage, isCreatingConversation };
};
