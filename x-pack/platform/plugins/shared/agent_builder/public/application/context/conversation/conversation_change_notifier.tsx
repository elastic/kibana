/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@kbn/react-query';
import produce from 'immer';
import type { Conversation, ConversationWithoutRounds } from '@kbn/agent-builder-common';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useConversation } from '../../hooks/use_conversation';
import { useConversationId } from './use_conversation_id';
import { useStreamingContext } from '../streaming/streaming_context';
import { queryKeys } from '../../query_keys';

/**
 * Publishes the active conversation to the shared `EventsService` whenever the
 * conversation id or fetch state changes, and resets it to `null` when the
 * subtree unmounts (e.g. the user navigates away from the full-page chat or
 * closes the sidebar).
 */
export const ConversationChangeNotifier = (): null => {
  const { eventsService, conversationsService } = useAgentBuilderServices();
  const conversationId = useConversationId();
  const { conversation, isError, isFetched } = useConversation();
  const { activeStreams } = useStreamingContext();
  const queryClient = useQueryClient();

  const isStreaming = Boolean(conversationId && activeStreams.has(conversationId));

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
    return () => {
      eventsService.clearActiveConversation();
    };
  }, [eventsService]);

  useEffect(() => {
    if (!isFetched || !conversation || conversation.read !== false || isStreaming) return;

    const { id, agent_id: agentId } = conversation;
    const byIdKey = queryKeys.conversations.byId(id);
    const byAgentKey = queryKeys.conversations.byAgent(agentId);

    queryClient.setQueryData<Conversation>(byIdKey, (current) => {
      if (!current) return current;
      return produce(current, (draft) => {
        draft.read = true;
      });
    });

    queryClient.setQueryData<ConversationWithoutRounds[]>(byAgentKey, (current) => {
      if (!current) return current;
      return produce(current, (draft) => {
        const conv = draft.find((c) => c.id === id);
        if (conv) conv.read = true;
      });
    });

    conversationsService.updateReadStatus({ conversationId: id, read: true }).catch(() => {
      void queryClient.invalidateQueries({ queryKey: byAgentKey });
    });
  }, [isFetched, conversation, isStreaming, conversationsService, queryClient]);

  return null;
};
