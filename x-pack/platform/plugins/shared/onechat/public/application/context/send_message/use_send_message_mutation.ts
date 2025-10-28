/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useRef, useState } from 'react';
import { useAgentId } from '../../hooks/use_conversation';
import { useConversationContext } from '../conversation/conversation_context';
import { useConversationId } from '../conversation/use_conversation_id';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import { useReportConverseError } from '../../hooks/use_report_error';
import { mutationKeys } from '../../mutation_keys';
import { usePendingMessageState } from './use_pending_message_state';
import { useSubscribeToChatEvents } from './use_subscribe_to_chat_events';

interface UseSendMessageMutationProps {
  connectorId?: string;
}

export const useSendMessageMutation = ({ connectorId }: UseSendMessageMutationProps = {}) => {
  const { chatService } = useOnechatServices();
  const { reportConverseError } = useReportConverseError();
  const { conversationActions } = useConversationContext();
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [agentReasoning, setAgentReasoning] = useState<string | null>(null);
  const conversationId = useConversationId();
  const isMutatingNewConversationRef = useRef(false);
  const agentId = useAgentId();
  const messageControllerRef = useRef<AbortController | null>(null);
  const {
    pendingMessageState: { error, pendingMessage },
    setPendingMessage,
    removePendingMessage,
    setError,
    removeError,
  } = usePendingMessageState({ conversationId });
  const subscribeToChatEvents = useSubscribeToChatEvents({
    setAgentReasoning,
    setIsResponseLoading,
    isAborted: () => Boolean(messageControllerRef?.current?.signal?.aborted),
  });

  const sendMessage = ({ message }: { message: string }) => {
    const signal = messageControllerRef.current?.signal;
    if (!signal) {
      return Promise.reject(new Error('Abort signal not present'));
    }
    const events$ = chatService.chat({
      signal,
      input: message,
      conversationId,
      agentId,
      connectorId,
    });

    return subscribeToChatEvents(events$);
  };

  const { mutate, isLoading } = useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: sendMessage,
    onMutate: ({ message }) => {
      const isNewConversation = !conversationId;
      isMutatingNewConversationRef.current = isNewConversation;
      setPendingMessage(message);
      removeError();
      messageControllerRef.current = new AbortController();
      conversationActions.addOptimisticRound({ userMessage: message });
      if (isNewConversation) {
        if (!agentId) {
          throw new Error('Agent id must be defined for a new conversation');
        }
        conversationActions.setAgentId(agentId);
      }
      setIsResponseLoading(true);
    },
    onSettled: () => {
      conversationActions.invalidateConversation();
      messageControllerRef.current = null;
      setAgentReasoning(null);
    },
    onSuccess: () => {
      removePendingMessage();
      if (isMutatingNewConversationRef.current) {
        conversationActions.removeNewConversationQuery();
      }
    },
    onError: (err) => {
      setIsResponseLoading(false);
      reportConverseError(err, { connectorId });
      setError(err);
      // When we error, we should immediately remove the round rather than waiting for a refetch after invalidation
      // Otherwise, the error round and the optimistic round will be visible together.
      conversationActions.removeOptimisticRound();
    },
  });

  const canCancel = isLoading;
  const cancel = () => {
    if (!canCancel) {
      return;
    }
    removePendingMessage();
    messageControllerRef.current?.abort();
  };

  return {
    sendMessage: mutate,
    isResponseLoading,
    error,
    pendingMessage,
    agentReasoning,
    retry: () => {
      if (
        // Retrying should not be allowed if a response is still being fetched
        // or if we're not in an error state
        isResponseLoading ||
        !error
      ) {
        return;
      }

      if (!pendingMessage) {
        // Should never happen
        // If we are in an error state, pending message will be present
        throw new Error('Pending message is not present');
      }

      mutate({ message: pendingMessage });
    },
    canCancel,
    cancel,
    // Cleaning only makes sense in the context of an error state on a new conversation round
    // The user can click "New" to clear the pending round and error
    cleanConversation: () => {
      conversationActions.removeOptimisticRound();
      removeError();
      removePendingMessage();
    },
  };
};
