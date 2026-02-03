/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { toToolMetadata } from '@kbn/agent-builder-browser/tools/browser_api_tool';
import { firstValueFrom } from 'rxjs';
import { isEqual } from 'lodash';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import type {
  Attachment,
  ScreenContextAttachmentData,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { useKibana } from '../../hooks/use_kibana';
import type { StartServices } from '../../hooks/use_kibana';
import { useAgentId, useConversation } from '../../hooks/use_conversation';
import { useConversationContext } from '../conversation/conversation_context';
import { useConversationId } from '../conversation/use_conversation_id';
import { useAgentBuilderServices } from '../../hooks/use_agent_builder_service';
import { mutationKeys } from '../../mutation_keys';
import { queryKeys } from '../../query_keys';
import { usePendingMessageState } from './use_pending_message_state';
import { useSubscribeToChatEvents } from './use_subscribe_to_chat_events';
import { BrowserToolExecutor } from '../../services/browser_tool_executor';

interface UseSendMessageMutationProps {
  connectorId?: string;
}

const SCREEN_CONTEXT_ATTACHMENT_ID = 'screen-context';

const buildScreenContextData = async ({
  services,
}: {
  services: StartServices;
}): Promise<ScreenContextAttachmentData | undefined> => {
  const url = window.location.href;
  const app = await firstValueFrom(services.application.currentAppId$);
  const additionalData: Record<string, string> = {};

  const timefilter = services.plugins.data?.query.timefilter.timefilter;
  if (timefilter) {
    const time = timefilter.getTime();
    if (time?.from) {
      additionalData.time_from = String(time.from);
    }
    if (time?.to) {
      additionalData.time_to = String(time.to);
    }
  }

  const data: ScreenContextAttachmentData = {
    ...(url ? { url } : {}),
    ...(app ? { app } : {}),
    ...(Object.keys(additionalData).length > 0 ? { additional_data: additionalData } : {}),
  };

  if (!data.url && !data.app && !data.additional_data) {
    return undefined;
  }

  return data;
};

const withScreenContextAttachment = async ({
  services,
  conversationAttachments,
}: {
  services: StartServices;
  conversationAttachments?: VersionedAttachment[];
}): Promise<Attachment[]> => {
  const data = await buildScreenContextData({ services });
  if (!data) {
    return [];
  }

  const existing = conversationAttachments?.find((attachment) => {
    return attachment.type === AttachmentType.screenContext;
  });

  const latest = existing ? getLatestVersion(existing) : undefined;
  if (latest?.data && isEqual(latest.data, data)) {
    return [];
  }

  return [
    {
      id: existing?.id ?? SCREEN_CONTEXT_ATTACHMENT_ID,
      type: AttachmentType.screenContext,
      data: data as Record<string, unknown>,
      hidden: true,
    },
  ];
};

export const useSendMessageMutation = ({ connectorId }: UseSendMessageMutationProps = {}) => {
  const { chatService } = useAgentBuilderServices();
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const { conversationActions, attachments, resetAttachments, browserApiTools } =
    useConversationContext();
  const [isResponseLoading, setIsResponseLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [agentReasoning, setAgentReasoning] = useState<string | null>(null);
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const isMutatingNewConversationRef = useRef(false);
  const agentId = useAgentId();
  const messageControllerRef = useRef<AbortController | null>(null);
  const resendControllerRef = useRef<AbortController | null>(null);

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

  // Separate subscription for resend operations with its own loading state
  const { subscribeToChatEvents: subscribeToResendEvents } = useSubscribeToChatEvents({
    setAgentReasoning,
    setIsResponseLoading: setIsResending,
    isAborted: () => Boolean(resendControllerRef?.current?.signal?.aborted),
    browserToolExecutor,
  });

  const sendMessage = async ({ message }: { message: string }) => {
    const signal = messageControllerRef.current?.signal;
    if (!signal) {
      return Promise.reject(new Error('Abort signal not present'));
    }

    const contextAttachments = await withScreenContextAttachment({
      services,
      conversationAttachments: conversation?.attachments,
    });

    const events$ = chatService.chat({
      signal,
      input: message,
      conversationId,
      agentId,
      connectorId,
      attachments: [...(attachments || []), ...contextAttachments],
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

  const resendMessage = async () => {
    const signal = resendControllerRef.current?.signal;
    if (!signal) {
      return Promise.reject(new Error('Abort signal not present'));
    }

    if (!conversationId) {
      return Promise.reject(new Error('Conversation ID is required to resend'));
    }

    // eslint-disable-next-line no-console
    console.log('[Resend] Starting resend for conversation:', conversationId);

    const events$ = chatService.resend({
      signal,
      conversationId,
      agentId,
      connectorId,
      browserApiTools: browserApiToolsMetadata,
    });

    return subscribeToResendEvents(events$);
  };

  const { mutate: resendMutate, isLoading: isResendLoading } = useMutation({
    mutationKey: mutationKeys.sendMessage,
    mutationFn: resendMessage,
    onMutate: async () => {
      removeError();
      resendControllerRef.current = new AbortController();

      // Cancel any in-flight queries for this conversation to prevent stale data
      // from overwriting the streaming response during resend.
      // The actual clearing of the response is handled by the roundResending event
      // emitted by the backend when the stream starts.
      await queryClient.cancelQueries({
        queryKey: queryKeys.conversations.byId(conversationId!),
      });

      setIsResending(true);
    },
    onSettled: () => {
      conversationActions.invalidateConversation();
      resendControllerRef.current = null;
      setAgentReasoning(null);
      if (isResending) {
        setIsResending(false);
      }
    },
    onError: (err) => {
      setError(err);
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
    /**
     * Resend the last conversation round.
     * Clears the response message and calls the API with resend=true.
     */
    resend: resendMutate,
    isResending: isResending || isResendLoading,
  };
};
