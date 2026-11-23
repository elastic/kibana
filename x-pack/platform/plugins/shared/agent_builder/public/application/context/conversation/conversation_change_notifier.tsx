/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useConversation, useAgentId } from '../../hooks/use_conversation';
import { useConversationId } from './use_conversation_id';
import { useIsCurrentConversationStreaming } from '../../hooks/use_is_current_conversation_streaming';
import { useConversationListMutations } from '../../hooks/use_conversation_list_mutations';

interface ConversationChangeNotifierProps {
  /** Explicit selection for embedded chat; omit the prop for routed chat. */
  agentId?: string;
}

/** Publishes the active agent and conversation binding, clearing it on unmount. */
export const ConversationChangeNotifier = (props: ConversationChangeNotifierProps = {}): null => {
  const { eventsService } = useAgentBuilderServices();
  const conversationId = useConversationId();
  const { conversation, isError, isFetched } = useConversation();
  const effectiveAgentId = useAgentId();
  const agentId = 'agentId' in props ? props.agentId : effectiveAgentId;

  const { markAsRead } = useConversationListMutations({
    routeConversationId: conversationId,
    agentId: agentId ?? '',
  });

  const isStreaming = useIsCurrentConversationStreaming();

  useEffect(() => {
    eventsService.setActiveConversation({
      id: conversationId,
      agentId,
      ...(conversationId && isFetched && !isError && conversation ? { conversation } : {}),
    });
  }, [agentId, conversationId, conversation, isError, isFetched, eventsService]);

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
