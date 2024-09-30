/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { Replacements } from '@kbn/elastic-assistant-common';
import { useKnowledgeBaseStatus } from '../api/knowledge_base/use_knowledge_base_status';
import { ESQL_RESOURCE } from '../../knowledge_base/setup_knowledge_base_button';
import { DataStreamApis } from '../use_data_stream_apis';
import { NEW_CHAT } from '../conversations/conversation_sidepanel/translations';
import type { ClientMessage } from '../../assistant_context/types';
import { SelectedPromptContext } from '../prompt_context/types';
import { useSendMessage } from '../use_send_message';
import { useConversation } from '../use_conversation';
import { getCombinedMessage } from '../prompt/helpers';
import { Conversation, useAssistantContext } from '../../..';
import { getMessageFromRawResponse } from '../helpers';

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
  const { assistantTelemetry, toasts } = useAssistantContext();
  const [userPrompt, setUserPrompt] = useState<string | null>(null);

  const { isLoading, sendMessage, abortStream } = useSendMessage();
  const { clearConversation, removeLastMessage } = useConversation();
  const { data: kbStatus } = useKnowledgeBaseStatus({ http, resource: ESQL_RESOURCE });
  const isSetupComplete =
    kbStatus?.elser_exists &&
    kbStatus?.index_exists &&
    kbStatus?.pipeline_exists &&
    kbStatus?.esql_exists;

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText: string) => {
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

      const userMessage = getCombinedMessage({
        currentReplacements: currentConversation.replacements,
        promptText,
        selectedPromptContexts,
      });

      const baseReplacements: Replacements =
        userMessage.replacements ?? currentConversation.replacements;

      const selectedPromptContextsReplacements = Object.values(
        selectedPromptContexts
      ).reduce<Replacements>((acc, context) => ({ ...acc, ...context.replacements }), {});

      const replacements: Replacements = {
        ...baseReplacements,
        ...selectedPromptContextsReplacements,
      };
      const updatedMessages = [...currentConversation.messages, userMessage].map((m) => ({
        ...m,
        content: m.content ?? '',
      }));
      setCurrentConversation({
        ...currentConversation,
        replacements,
        messages: updatedMessages,
      });

      // Reset prompt context selection and preview before sending:
      setSelectedPromptContexts({});

      const rawResponse = await sendMessage({
        apiConfig: currentConversation.apiConfig,
        http,
        message: userMessage.content ?? '',
        conversationId: currentConversation.id,
        replacements,
      });

      assistantTelemetry?.reportAssistantMessageSent({
        conversationId: currentConversation.title,
        role: userMessage.role,
        actionTypeId: currentConversation.apiConfig.actionTypeId,
        model: currentConversation.apiConfig.model,
        provider: currentConversation.apiConfig.provider,
        isEnabledKnowledgeBase: isSetupComplete ?? false,
      });

      const responseMessage: ClientMessage = getMessageFromRawResponse(rawResponse);

      setCurrentConversation({
        ...currentConversation,
        replacements,
        messages: [...updatedMessages, responseMessage],
      });
      assistantTelemetry?.reportAssistantMessageSent({
        conversationId: currentConversation.title,
        role: responseMessage.role,
        actionTypeId: currentConversation.apiConfig.actionTypeId,
        model: currentConversation.apiConfig.model,
        provider: currentConversation.apiConfig.provider,
        isEnabledKnowledgeBase: isSetupComplete ?? false,
      });
    },
    [
      assistantTelemetry,
      currentConversation,
      http,
      isSetupComplete,
      selectedPromptContexts,
      sendMessage,
      setCurrentConversation,
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
      replacements: {},
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
      if (currentConversation?.title === NEW_CHAT) {
        await refetchCurrentUserConversations();
      }
    },
    [currentConversation, handleSendMessage, refetchCurrentUserConversations]
  );

  return {
    handleOnChatCleared,
    handleChatSend,
    abortStream,
    handleRegenerateResponse,
    isLoading,
    userPrompt,
    setUserPrompt,
  };
};
