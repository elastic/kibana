/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useConversation, useAgentId } from '../../hooks/use_conversation';
import { useConversationId } from './use_conversation_id';
import { useIsCurrentConversationStreaming } from '../../hooks/use_is_current_conversation_streaming';
import { useConversationListMutations } from '../../hooks/use_conversation_list_mutations';
import { queryKeys } from '../../query_keys';

/**
 * Publishes the active conversation to the shared `EventsService` whenever the
 * conversation id or fetch state changes, and resets it to `null` when the
 * subtree unmounts (e.g. the user navigates away from the full-page chat or
 * closes the sidebar). Refetches the conversation when it is updated on the
 * server outside a chat run, so the published conversation stays current.
 */
export const ConversationChangeNotifier = (): null => {
  const { eventsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const conversationId = useConversationId();
  const { conversation, isError, isFetched } = useConversation();
  const agentId = useAgentId();

  const { markAsRead } = useConversationListMutations({
    routeConversationId: conversationId,
    agentId: agentId ?? '',
  });

  const isStreaming = useIsCurrentConversationStreaming();

  useEffect(() => {
    if (!conversationId) {
      eventsService.setActiveConversation({ id: undefined });
      return;
    }

    if (isError) {
      eventsService.setActiveConversation({ id: conversationId });
      return;
    }

    if (isFetched && conversation) {
      eventsService.setActiveConversation({ id: conversationId, conversation });
    }
  }, [conversationId, conversation, isError, isFetched, eventsService]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }
    const subscription = eventsService.getConversationUpdated$(conversationId).subscribe(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(conversationId) });
    });
    return () => subscription.unsubscribe();
  }, [conversationId, eventsService, queryClient]);

  useEffect(() => {
    return () => {
      eventsService.clearActiveConversation();
    };
  }, [eventsService]);

  useEffect(() => {
    if (!isFetched || !conversation || conversation.read !== false || isStreaming) return;
    markAsRead(conversation.id);
  }, [isFetched, conversation, isStreaming, markAsRead]);

  return null;
};
