/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { useConversation } from '../../hooks/use_conversation';
import { useConversationId } from './use_conversation_id';

/**
 * Publishes the active conversation to the shared `EventsService` whenever the
 * conversation id or fetch state changes, and resets it to `null` when the
 * subtree unmounts (e.g. the user navigates away from the full-page chat or
 * closes the sidebar).
 */
export const ConversationChangeNotifier = (): null => {
  const { eventsService } = useAgentBuilderServices();
  const conversationId = useConversationId();
  const { conversation, isError, isFetched } = useConversation();

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

  return null;
};
