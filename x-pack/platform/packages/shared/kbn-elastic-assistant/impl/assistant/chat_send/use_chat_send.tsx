/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { useCallback, useState } from 'react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { Replacements } from '@kbn/elastic-assistant-common';
import { useKnowledgeBaseStatus } from '../api/knowledge_base/use_knowledge_base_status';
import type { DataStreamApis } from '../use_data_stream_apis';
import type { ClientMessage } from '../../assistant_context/types';
import type { SelectedPromptContext } from '../prompt_context/types';
import { useSendMessage } from '../use_send_message';
import { useConversation } from '../use_conversation';
import { getCombinedMessage } from '../prompt/helpers';
import type { Conversation } from '../../..';
import { useAssistantContext } from '../../..';
import { getMessageFromRawResponse } from '../helpers';
import { useAssistantSpaceId, useAssistantLastConversation } from '../use_space_aware_context';

export interface UseChatSendProps {
  currentConversation?: Conversation;
  http: HttpSetup;
  refetchCurrentUserConversations: DataStreamApis['refetchCurrentUserConversations'];
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
}

export interface UseChatSend {
  abortStream: () => void;
  handleOnChatCleared: () => Promise<void>;
  handleRegenerateResponse: () => void;
  handleChatSend: (promptText: string) => Promise<void>;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
  isLoading: boolean;
  userPrompt: string | null;
}

/**
 * Handles sending user messages to the API and updating the conversation state.
 */
export const useChatSend = ({
  currentConversation,
  http,
  refetchCurrentUserConversations,
  selectedPromptContexts,
  setSelectedPromptContexts,
  setCurrentConversation,
}: UseChatSendProps): UseChatSend => {
  const {
    assistantTelemetry,
    toasts,
    assistantAvailability: { isAssistantEnabled },
    currentUser,
  } = useAssistantContext();
  const spaceId = useAssistantSpaceId();
  const { setLastConversation } = useAssistantLastConversation({ spaceId });
  const [userPrompt, setUserPrompt] = useState<string | null>(null);

  const { sendMessage, abortStream } = useSendMessage();
  const { clearConversation, createConversation, getConversation, removeLastMessage } =
    useConversation();
  const { data: kbStatus } = useKnowledgeBaseStatus({ http, enabled: isAssistantEnabled });
  const isSetupComplete = kbStatus?.elser_exists && kbStatus?.security_labs_exists;

  // Local loading state that persists until the entire message flow is complete
  const [isLoadingChatSend, setIsLoadingChatSend] = useState(false);

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText: string) => {
      if (!currentConversation?.apiConfig) {
        toasts?.addError(
          new Error('The conversation needs a connector configured in order to send a message.'),
          {
            title: i18n.translate('xpack.elasticAssistant.conversationConfig.setupError', {
              defaultMessage: 'Error with conversation configuration',
            }),
          }
        );
        return;
      }

      setIsLoadingChatSend(true);

      try {
        const apiConfig = currentConversation.apiConfig;
        let newConvo;
        if (currentConversation.id === '') {
          // create conversation with empty title, GENERATE_CHAT_TITLE graph step will properly title
          newConvo = await createConversation(currentConversation);
          if (newConvo?.id) {
            setLastConversation({
              id: newConvo.id,
            });
          }
        }
        const convo: Conversation = { ...currentConversation, ...(newConvo ?? {}) };
        const userMessage = getCombinedMessage({
          currentReplacements: convo.replacements,
          promptText,
          selectedPromptContexts,
          user: currentUser,
        });

        const baseReplacements: Replacements = userMessage.replacements ?? convo.replacements;

        const selectedPromptContextsReplacements = Object.values(
          selectedPromptContexts
        ).reduce<Replacements>((acc, context) => ({ ...acc, ...context.replacements }), {});

        const replacements: Replacements = {
          ...baseReplacements,
          ...selectedPromptContextsReplacements,
        };
        const updatedMessages = [...convo.messages, userMessage].map((m) => ({
          ...m,
          content: m.content ?? '',
        }));
        setCurrentConversation({
          ...convo,
          replacements,
          messages: updatedMessages,
        });

        // Reset prompt context selection and preview before sending:
        setSelectedPromptContexts({});

        const rawResponse = await sendMessage({
          apiConfig,
          http,
          message: userMessage.content ?? '',
          conversationId: convo.id,
          replacements,
        });

        assistantTelemetry?.reportAssistantMessageSent({
          role: userMessage.role,
          actionTypeId: apiConfig.actionTypeId,
          model: apiConfig.model,
          provider: apiConfig.provider,
          isEnabledKnowledgeBase: isSetupComplete ?? false,
        });

        const responseMessage: ClientMessage = getMessageFromRawResponse(rawResponse);
        if (convo.title === '') {
          // Retry getConversation up to 5 times if title is empty
          let retryCount = 0;
          const maxRetries = 5;
          while (retryCount < maxRetries) {
            const conversation = await getConversation(convo.id);
            convo.title = conversation?.title ?? '';

            if (convo.title !== '') {
              break; // Title found, exit retry loop
            }

            retryCount++;
            if (retryCount < maxRetries) {
              // Wait 1 second before next retry
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }
        }
        setCurrentConversation({
          ...convo,
          replacements,
          messages: [...updatedMessages, responseMessage],
        });
        assistantTelemetry?.reportAssistantMessageSent({
          role: responseMessage.role,
          actionTypeId: apiConfig.actionTypeId,
          model: apiConfig.model,
          provider: apiConfig.provider,
          isEnabledKnowledgeBase: isSetupComplete ?? false,
        });
      } finally {
        setIsLoadingChatSend(false);
      }
    },
    [
      assistantTelemetry,
      createConversation,
      currentConversation,
      currentUser,
      getConversation,
      http,
      isSetupComplete,
      selectedPromptContexts,
      sendMessage,
      setCurrentConversation,
      setLastConversation,
      setSelectedPromptContexts,
      toasts,
    ]
  );

  const handleRegenerateResponse = useCallback(async () => {
    if (!currentConversation?.apiConfig) {
      toasts?.addError(
        new Error('The conversation needs a connector configured in order to send a message.'),
        {
          title: i18n.translate('xpack.elasticAssistant.knowledgeBase.setupError', {
            defaultMessage: 'Error setting up Knowledge Base',
          }),
        }
      );
      return;
    }
    // remove last message from the local state immediately
    setCurrentConversation({
      ...currentConversation,
      messages: currentConversation.messages.slice(0, -1),
    });
    const updatedMessages = (await removeLastMessage(currentConversation.id)) ?? [];

    const rawResponse = await sendMessage({
      apiConfig: currentConversation.apiConfig,
      http,
      // do not send any new messages, the previous conversation is already stored
      conversationId: currentConversation.id,
      replacements: currentConversation.replacements,
    });

    const responseMessage: ClientMessage = getMessageFromRawResponse(rawResponse);
    setCurrentConversation({
      ...currentConversation,
      messages: [...updatedMessages, responseMessage],
    });
  }, [currentConversation, http, removeLastMessage, sendMessage, setCurrentConversation, toasts]);

  const onChatCleared = useCallback(async () => {
    setUserPrompt('');
    setSelectedPromptContexts({});
    if (currentConversation) {
      const updatedConversation = await clearConversation(currentConversation);
      if (updatedConversation) {
        setCurrentConversation(updatedConversation);
      }
    }
  }, [
    clearConversation,
    currentConversation,
    setCurrentConversation,
    setSelectedPromptContexts,
    setUserPrompt,
  ]);

  const handleOnChatCleared = useCallback(async () => {
    await onChatCleared();
    await refetchCurrentUserConversations();
  }, [onChatCleared, refetchCurrentUserConversations]);

  const handleChatSend = useCallback(
    async (promptText: string) => {
      await handleSendMessage(promptText);
      // refetch to update the conversation list
      await refetchCurrentUserConversations();
    },
    [handleSendMessage, refetchCurrentUserConversations]
  );

  return {
    handleOnChatCleared,
    handleChatSend,
    abortStream,
    handleRegenerateResponse,
    isLoading: isLoadingChatSend,
    userPrompt,
    setUserPrompt,
  };
};
