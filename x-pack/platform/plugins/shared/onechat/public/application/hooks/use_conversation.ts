/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { oneChatDefaultAgentId } from '@kbn/onechat-common';
import { queryKeys } from '../query_keys';
import { newConversationId, createNewRound } from '../utils/new_conversation';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useIsSendingMessage } from './use_is_sending_message';
import { useOnechatServices } from './use_onechat_service';
import { storageKeys } from '../storage_keys';
import { useSendMessage } from '../context/send_message/send_message_context';
import { useValidateAgentId } from './agents/use_validate_agent_id';
import { useConversationContext } from '../context/conversation/conversation_context';

export const useConversation = () => {
  const conversationId = useConversationId();
  const { conversationsService } = useOnechatServices();
  const queryKey = queryKeys.conversations.byId(conversationId ?? newConversationId);
  const isSendingMessage = useIsSendingMessage();

  const {
    data: conversation,
    isLoading,
    isFetching,
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

  return { conversation, isLoading, isFetching, isFetched };
};

export const useConversationStatus = () => {
  const { isLoading, isFetching, isFetched } = useConversation();
  return { isLoading, isFetching, isFetched };
};

const useGetNewConversationAgentId = () => {
  const [agentIdStorage] = useLocalStorage<string>(storageKeys.agentId);
  const validateAgentId = useValidateAgentId();

  // Ensure we always return a string
  return (): string => {
    const isAgentIdValid = validateAgentId(agentIdStorage);
    if (isAgentIdValid) {
      return agentIdStorage;
    }
    return oneChatDefaultAgentId;
  };
};

export const useAgentId = () => {
  const { conversation } = useConversation();
  const context = useConversationContext();
  const agentId = conversation?.agent_id;
  const conversationId = useConversationId();
  const isNewConversation = !conversationId;
  const getNewConversationAgentId = useGetNewConversationAgentId();

  if (agentId) {
    return agentId;
  }

  if (context.agentId) {
    return context.agentId;
  }

  // For new conversations, agent id must be defined
  if (isNewConversation) {
    return getNewConversationAgentId();
  }

  return undefined;
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
      const pendingRound = createNewRound({ userMessage: pendingMessage, roundId: '' });
      return [...rounds, pendingRound];
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

/**
 * Hook to get conversation-level versioned attachments.
 * These are attachments that persist across the entire conversation.
 */
export const useConversationAttachments = () => {
  const { conversation } = useConversation();
  return conversation?.attachments;
};

/**
 * Hook to get the set of attachment IDs that have been referenced in conversation rounds.
 * An attachment is referenced if any tool call result contains an __attachment_operation__
 * marker with that attachment_id.
 */
export const useReferencedAttachmentIds = (): Set<string> => {
  const conversationRounds = useConversationRounds();

  return useMemo(() => {
    const referencedIds = new Set<string>();

    for (const round of conversationRounds) {
      for (const step of round.steps) {
        if (step.type !== 'tool_call') continue;

        for (const result of step.results) {
          const data = result.data as Record<string, unknown> | undefined;
          if (!data || !data.__attachment_operation__) continue;

          const attachmentId = data.attachment_id as string | undefined;
          if (attachmentId) {
            referencedIds.add(attachmentId);
          }
        }
      }
    }

    return referencedIds;
  }, [conversationRounds]);
};

/**
 * Simple token estimation based on string length.
 * Uses ~4 characters per token heuristic.
 */
const estimateTokensFromString = (str: string): number => {
  return Math.ceil(str.length / 4);
};

/**
 * Estimated context size for the next LLM request.
 */
export interface ConversationContextEstimate {
  /** Estimated tokens from conversation history (messages, tool calls, responses) */
  historyTokens: number;
  /** Estimated tokens from active attachments */
  attachmentTokens: number;
  /** Total estimated context tokens for next request */
  totalContextTokens: number;
  /** Number of rounds in the conversation */
  roundCount: number;
}

/**
 * Hook to estimate the context size for the next LLM request.
 * This estimates how many tokens will be sent in the next request,
 * NOT the cumulative tokens used across all rounds.
 */
export const useConversationContextEstimate = (): ConversationContextEstimate => {
  const conversationRounds = useConversationRounds();
  const attachments = useConversationAttachments();

  return useMemo(() => {
    // Estimate tokens from conversation history
    let historyTokens = 0;

    for (const round of conversationRounds) {
      // User message
      historyTokens += estimateTokensFromString(round.input.message);

      // Tool calls and results
      for (const step of round.steps) {
        if (step.type === 'tool_call') {
          // Tool call params
          historyTokens += estimateTokensFromString(JSON.stringify(step.params));
          // Tool results
          for (const result of step.results) {
            historyTokens += estimateTokensFromString(JSON.stringify(result.data));
          }
        } else if (step.type === 'reasoning') {
          // Reasoning content (if included in context)
          historyTokens += estimateTokensFromString(step.reasoning);
        }
      }

      // Assistant response
      historyTokens += estimateTokensFromString(round.response.message);
    }

    // Get tokens from active attachments
    let attachmentTokens = 0;
    if (attachments) {
      for (const attachment of attachments) {
        // Only count active attachments
        const latestVersion = attachment.versions.find(
          (v) => v.version === attachment.current_version
        );
        if (latestVersion?.status === 'active' && latestVersion.estimated_tokens) {
          attachmentTokens += latestVersion.estimated_tokens;
        }
      }
    }

    return {
      historyTokens,
      attachmentTokens,
      totalContextTokens: historyTokens + attachmentTokens,
      roundCount: conversationRounds.length,
    };
  }, [conversationRounds, attachments]);
};
