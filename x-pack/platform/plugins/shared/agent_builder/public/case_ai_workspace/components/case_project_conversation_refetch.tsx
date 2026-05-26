/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { isConversationCreatedEvent } from '@kbn/agent-builder-common';
import { useConversationId } from '../../application/context/conversation/use_conversation_id';
import { useAgentBuilderServices } from '../../application/hooks/use_agent_builder_service';

/**
 * Refetches the case project when a conversation is persisted so the sidebar
 * `conversation_ids` list stays in sync.
 */
export const CaseProjectConversationRefetch = ({
  onRefetch,
}: {
  onRefetch: () => void;
}): null => {
  const conversationId = useConversationId();
  const { eventsService } = useAgentBuilderServices();

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const subscription = eventsService.getChatEvents$(conversationId).subscribe((event) => {
      if (isConversationCreatedEvent(event)) {
        onRefetch();
      }
    });

    return () => subscription.unsubscribe();
  }, [conversationId, eventsService, onRefetch]);

  return null;
};
