/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { useSendMessage } from '../context/send_message_context';
import { queryKeys } from '../query_keys';
import { newConversationId } from '../utils/new_conversation';
import { useConversationId } from './use_conversation_id';
import { useIsSendingMessage } from './use_is_sending_message';
import { useOnechatServices } from './use_onechat_service';
import { useOnechatLastConversation } from './use_space_aware_context/use_last_conversation';
import { useOnechatSpaceId } from './use_space_aware_context/use_space_id';
import type { ConversationSettings } from '../../services/types';

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useOnechatServices();
  const spaceId = useOnechatSpaceId();
  const { setLastConversation } = useOnechatLastConversation({ spaceId });
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
      return conversationsService.get({ conversationId }).catch((error) => {
        // If conversation is not found on server, set localStorageLastConversation to empty string
        if (error.response.status === 404) {
          setLastConversation({ id: '' });
        }
      });
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
  const { conversationSettingsService } = useOnechatServices();

  const conversationSettings = useObservable<ConversationSettings>(
    conversationSettingsService.getConversationSettings$(),
    {}
  );

  // Return the agent_id from conversation if available, otherwise return the defaultAgentId from settings
  // If no defaultAgentId is set in settings, fall back to the oneChatDefaultAgentId constant
  return conversation?.agent_id ?? conversationSettings?.defaultAgentId ?? oneChatDefaultAgentId;
};

export const useConversationTitle = () => {
  const { conversation, isLoading } = useConversation();
  return { title: conversation?.title ?? '', isLoading };
};

export const useConnectorId = () => {
  const { conversation } = useConversation();
  // Return the connector_id from conversation if available, otherwise return an empty string
  return conversation?.connector_id;
};

export const useConversationRounds = () => {
  const { conversation } = useConversation();
  const { pendingMessage, error } = useSendMessage();

  const conversationRounds = useMemo(() => {
    const rounds = conversation?.rounds ?? [];
    if (Boolean(error) && pendingMessage) {
      return [
        ...rounds,
        { id: '', input: { message: pendingMessage }, response: { message: '' }, steps: [] },
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
  return Boolean(conversationId && conversationRounds.length > 0);
};
