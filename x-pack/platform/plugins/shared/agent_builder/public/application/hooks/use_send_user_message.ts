/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { flattenAttachments } from '../context/conversation/flatten_attachments';
import { withoutPreAddedAttachments } from '../context/conversation/without_pre_added_attachments';
import { queryKeys } from '../query_keys';
import { mutationKeys } from '../mutation_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { ChatTriggerMode } from '../../../common/http_api/chat';

/**
 * Posts a user message to the current conversation without running the agent. The response is
 * the updated conversation, which replaces the cached one.
 */
export const useSendUserMessage = () => {
  const conversationId = useConversationId();
  const { attachments, removeAttachments } = useConversationContext();
  const { chatService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.sendUserMessage(conversationId),
    // Remembers what was sent, so attachments added while the post runs stay in the composer.
    onMutate: () => ({ sentAttachments: attachments ?? [] }),
    mutationFn: (message: string) => {
      if (!conversationId) {
        return Promise.reject(new Error('Cannot send a user message without a conversation id'));
      }
      const conversation = queryClient.getQueryData<Conversation>(
        queryKeys.conversations.byId(conversationId)
      );
      return chatService.sendUserMessage({
        conversationId,
        input: message,
        attachments: withoutPreAddedAttachments(
          flattenAttachments(attachments ?? []),
          conversation?.attachments
        ),
        triggerMode: ChatTriggerMode.Never,
      });
    },
    onSuccess: (conversation, _message, context) => {
      queryClient.setQueryData(queryKeys.conversations.byId(conversation.id), conversation);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.list });
      removeAttachments?.(context?.sentAttachments ?? []);
    },
  });
};
