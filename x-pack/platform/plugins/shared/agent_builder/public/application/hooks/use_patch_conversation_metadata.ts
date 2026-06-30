/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useConversation } from './use_conversation';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const usePatchConversationMetadata = () => {
  const { conversationsService } = useAgentBuilderServices();
  const { conversationActions } = useConversationContext();
  const conversationId = useConversationId();
  const { conversation } = useConversation();

  return useMutation({
    mutationFn: async (fieldUpdate: Record<string, unknown>) => {
      if (!conversationId) {
        throw new Error('Conversation id is required');
      }

      return conversationsService.patch({
        conversationId,
        custom_fields: {
          ...(conversation?.custom_fields ?? {}),
          ...fieldUpdate,
        },
      });
    },
    onSuccess: () => {
      conversationActions.invalidateConversation();
    },
  });
};
