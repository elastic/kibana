/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { toToolMetadata } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import { useAgentId, useConversation } from '../../hooks/use_conversation';
import { useConversationContext } from '../conversation/conversation_context';
import { useConversationId } from '../conversation/use_conversation_id';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { usePendingMessageState } from './use_pending_message_state';
import { useSubscribeToChatEvents } from './use_subscribe_to_chat_events';
import { BrowserToolExecutor } from '../../services/browser_tool_executor';

interface UseSendMessageMutationProps {
  connectorId?: string;
}

export const useSendMessageMutation = ({ connectorId }: UseSendMessageMutationProps = {}) => {
  const { chatService } = useAgentBuilderServices();
  const { services } = useKibana();
  const { conversationActions, attachments, resetAttachments, browserApiTools } =
    useConversationContext();
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [agentReasoning, setAgentReasoning] = useState<string | null>(null);
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const isMutatingNewConversationRef = useRef(false);
  const agentId = useAgentId();
  const messageControllerRef = useRef<AbortController | null>(null);

  const [error, setError] = useState<unknown | null>(null);
  const [errorSteps, setErrorSteps] = useState<ConversationRoundStep[]>([]);

  const removeError = useCallback(() => {
    setError(null);
    setErrorSteps([]);
  }, []);

  useEffect(() => {
    // Clear errors any time conversation id changes - we do not persist it.
    if (conversationId) {
      removeError();
    }
  }, [conversationId, removeError]);

  const browserApiToolsMetadata = useMemo(() => {
    if (!browserApiTools) return undefined;
    return browserApiTools.map(toToolMetadata);
  }, [browserApiTools]);

  const browserToolExecutor = useMemo(() => {
    return new BrowserToolExecutor(services.notifications?.toasts);
  }, [services.notifications?.toasts]);

  const {
    pendingMessageState: { pendingMessage },
    setPendingMessage,
    removePendingMessage,
  } = usePendingMessageState({ conversationId });
  const { subscribeToChatEvents, unsubscribeFromChatEvents } = useSubscribeToChatEvents({
    setAgentReasoning,
    setIsResponseLoading,
    isAborted: () => Boolean(messageControllerRef?.current?.signal?.aborted),
    browserToolExecutor,
  });

  const sendMessage = async ({ message }: { message: string }) => {
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
      attachments: attachments ?? [],
      browserApiTools: browserApiToolsMetadata,
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
      conversationActions.addOptimisticRound({
        userMessage: message,
        attachments: attachments ?? [],
      });
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
      if (isResponseLoading) {
        setIsResponseLoading(false);
      }
    },
    onSuccess: () => {
      removePendingMessage();
      resetAttachments?.();
      if (isMutatingNewConversationRef.current) {
        conversationActions.removeNewConversationQuery();
      }
    },
    onError: (err) => {
      setError(err);
      const steps = conversation?.rounds?.at(-1)?.steps;
      if (steps) {
        setErrorSteps(steps);
      }
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
    errorSteps,
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
    cleanConversation: () => {
      // Cleaning the conversation only happens when we are on "/new" and the user wants to back out of a pending or errored conversation and return to an empty conversation state
      if (isLoading) {
        // Conversation round is pending, unsubscribe from chat events and resolve mutation
        unsubscribeFromChatEvents();
      } else if (Boolean(error)) {
        removeError();
        removePendingMessage();
      }
    },
  };
};
