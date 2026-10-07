/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@kbn/react-query';
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

const useCreateConversation = () => {
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const { addErrorToast } = useToasts();

  const { mutateAsync: createConversation, isLoading: isCreatingConversation } = useMutation({
    mutationKey: mutationKeys.createConversation,
    mutationFn: (id: string) => conversationsService.create({ agentId: id }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.conversations.byId(created.id), created);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
    },
    onError: (error) => addErrorToast({ title: formatAgentBuilderErrorMessage(error) }),
  });

  return { createConversation, isCreatingConversation };
};

/**
 * POC: creates an empty conversation and opens it, so a PDF can be added before the first message.
 * Returns the new conversation id, or undefined when the create failed.
 */
export const useOpenNewConversation = () => {
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const agentId = useAgentId();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { createConversation } = useCreateConversation();

  return useCallback(async (): Promise<string | undefined> => {
    if (!agentId) return undefined;
    let created;
    try {
      created = await createConversation(agentId);
    } catch {
      return undefined;
    }
    if (isEmbeddedContext) {
      setConversationId?.(created.id);
    } else {
      navigateToAgentBuilderUrl(
        appPaths.agent.conversations.byId({ agentId, conversationId: created.id })
      );
    }
    return created.id;
  }, [
    agentId,
    createConversation,
    isEmbeddedContext,
    setConversationId,
    navigateToAgentBuilderUrl,
  ]);
};

/**
 * Single source of truth for "send this message". A new conversation is created on the server
 * first, so it exists, is cached and is in the sidebar before anything streams into it; then the
 * user is moved to it, by URL in the routed app or by state in the embeddable.
 * `isCreatingConversation` is true while that request is in flight, so the input can hold submits.
 */
export const useSubmitMessage = () => {
  const conversationId = useConversationId();
  const { sendMessage } = useConversationStream();
  const { isEmbeddedContext, setConversationId } = useConversationContext();
  const agentId = useAgentId();
  const { navigateToAgentBuilderUrl } = useNavigation();
  const { createConversation, isCreatingConversation } = useCreateConversation();

  const submitMessage = useCallback(
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
        created = await createConversation(agentId);
      } catch {
        return;
      }

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
      createConversation,
      isEmbeddedContext,
      setConversationId,
      navigateToAgentBuilderUrl,
    ]
  );

  return { submitMessage, isCreatingConversation };
};
