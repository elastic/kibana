/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import type { Conversation } from '@kbn/onechat-common';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { isEmpty } from 'lodash';
import { useSendMessage } from '../context/send_message_context';
import { queryKeys } from '../query_keys';
import { newConversationId } from '../utils/new_conversation';
import { useConversationId } from './use_conversation_id';
import { useIsSendingMessage } from './use_is_sending_message';
import { useOnechatServices } from './use_onechat_service';

export const useConversation = <K extends keyof Conversation>(
  selector?: K
): K extends never ? Conversation | undefined : Conversation[K] | undefined => {
  const { conversationsService } = useOnechatServices();
  const conversationId = useConversationId();
  const isSendingMessage = useIsSendingMessage();
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);

  const { data } = useQuery({
    queryKey,
    enabled: Boolean(conversationId) && !isSendingMessage,
    // The select function is now dynamic based on the selector argument
    select: (conversation) => {
      // If a selector is provided, return that slice of the conversation.
      if (selector) {
        return conversation?.[selector];
      }
      // Otherwise, return the entire conversation object.
      return conversation;
    },
    queryFn: () => {
      if (!conversationId) {
        return Promise.reject(new Error('Invalid conversation id'));
      }
      return conversationsService.get({ conversationId });
    },
  });

  return data;
};

export const useAgentId = () => {
  const agentId = useConversation('agent_id');
  return agentId ?? oneChatDefaultAgentId;
};

export const useConversationTitle = () => {
  const title = useConversation('title');
  return title ?? '';
};

export const useConversationRounds = () => {
  const rounds = useConversation('rounds');
  const { pendingMessage, error } = useSendMessage();

  const conversationRounds = useMemo(() => {
    if (Boolean(error) && pendingMessage) {
      return [
        ...(rounds ?? []),
        { input: { message: pendingMessage }, response: { message: '' }, steps: [] },
      ];
    }
    return rounds ?? [];
  }, [error, pendingMessage, rounds]);

  return conversationRounds;
};

export const useHasActiveConversation = () => {
  const conversationId = useConversationId();
  const conversationRounds = useConversationRounds();
  return Boolean(conversationId || !isEmpty(conversationRounds));
};
