/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSendMessage } from '../context/send_message_context';
import { queryKeys } from '../query_keys';
import { newConversationId } from '../utils/new_conversation';
import { useConversationId } from './use_conversation_id';
import { useIsSendingMessage } from './use_is_sending_message';
import { useOnechatServices } from './use_onechat_service';

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useOnechatServices();
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);
  const isSendingMessage = useIsSendingMessage();
  const {
    data: conversation,
    isLoading,
    isFetched,
  } = useQuery({
    queryKey,
    // Disable query if we are on a new conversation or if there is a message currently being sent
    // Otherwise a refetch will overwrite our optimistic updates
    enabled: Boolean(conversationId) && !isSendingMessage,
    queryFn: () => {
      if (!conversationId) {
        return Promise.reject(new Error('Invalid conversation id'));
      }
      return conversationsService.get({ conversationId });
    },
  });

  return { conversation, isLoading, isFetched };
};

export const useConversationStatus = () => {
  const { isLoading, isFetched } = useConversation();
  return { isLoading, isFetched };
};

export const useAgentId = () => {
  const { conversation } = useConversation();
  return conversation?.agent_id;
};

export const useConversationTitle = () => {
  const { conversation, isLoading } = useConversation();
  return { title: conversation?.title ?? '', isLoading };
};

export const useConversationRounds = () => {
  const { conversation } = useConversation();
  const { pendingMessage, error } = useSendMessage();

  const conversationRounds = useMemo(() => {
    const rounds = conversation?.rounds ?? [];
    if (Boolean(error) && pendingMessage) {
      return [
        ...rounds,
        { input: { message: pendingMessage }, response: { message: '' }, steps: [] },
      ];
    }
    return rounds;
  }, [conversation?.rounds, error, pendingMessage]);

  return conversationRounds;
};

// Returns a flattened list of all steps across all rounds.
// CAUTION: This uses `conversationRounds.length` as useMemo key to prevent re-renders during streaming. This will return stale data for the last round. It will only contain the complete set of steps up until the previous round.
export const useStepsFromPrevRounds = () => {
  const conversationRounds = useConversationRounds();

  return useMemo(() => {
    return conversationRounds.flatMap(({ steps }) => steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationRounds.length]); // only depend on length to avoid re-renders during streaming
};

export const useHasActiveConversation = () => {
  const conversationId = useConversationId();
  const conversationRounds = useConversationRounds();
  return Boolean(conversationId || conversationRounds.length > 0);
};
