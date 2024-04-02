/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { SelectedPromptContext } from '../prompt_context/types';
import { useSendMessage } from '../use_send_message';
import { useConversation } from '../use_conversation';
import { getCombinedMessage } from '../prompt/helpers';
import { Conversation, Message, Prompt, useAssistantContext } from '../../..';
import { getMessageFromRawResponse } from '../helpers';
import { getDefaultSystemPrompt } from '../use_conversation/helpers';

export interface UseChatSendProps {
  allSystemPrompts: Prompt[];
  currentConversation: Conversation;
  editingSystemPromptId: string | undefined;
  http: HttpSetup;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setEditingSystemPromptId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setPromptTextPreview: React.Dispatch<React.SetStateAction<string>>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation>>;
}

export interface UseChatSend {
  handleButtonSendMessage: (m: string) => void;
  handleOnChatCleared: () => void;
  handlePromptChange: (prompt: string) => void;
  handleSendMessage: (promptText: string) => void;
  handleRegenerateResponse: () => void;
  isLoading: boolean;
}

/**
 *  handles sending messages to an API and updating the conversation state.
 *  Provides a set of functions that can be used to handle user input, send messages to an API,
 *  and update the conversation state based on the API response.
 */
export const useChatSend = ({
  allSystemPrompts,
  currentConversation,
  editingSystemPromptId,
  http,
  selectedPromptContexts,
  setEditingSystemPromptId,
  setPromptTextPreview,
  setSelectedPromptContexts,
  setUserPrompt,
  setCurrentConversation,
}: UseChatSendProps): UseChatSend => {
  const {
    assistantTelemetry,
    knowledgeBase: { isEnabledKnowledgeBase, isEnabledRAGAlerts },
    toasts,
  } = useAssistantContext();

  const { isLoading, sendMessage } = useSendMessage();
  const { clearConversation, removeLastMessage } = useConversation();

  const handlePromptChange = (prompt: string) => {
    setPromptTextPreview(prompt);
    setUserPrompt(prompt);
  };

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText: string) => {
      if (!currentConversation.apiConfig) {
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
      const systemPrompt = allSystemPrompts.find((prompt) => prompt.id === editingSystemPromptId);

      const userMessage = getCombinedMessage({
        isNewChat: currentConversation.messages.length === 0,
        currentReplacements: currentConversation.replacements,
        promptText,
        selectedPromptContexts,
        selectedSystemPrompt: systemPrompt,
      });

      const replacements = userMessage.replacements ?? currentConversation.replacements;
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
      setPromptTextPreview('');

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
        isEnabledKnowledgeBase,
        isEnabledRAGAlerts,
        // TODO before merge to main
        // this will be available once 174126 is merged
        actionTypeId: '.gen-ai', // currentConversation.apiConfig.actionTypeId,
        model: currentConversation.apiConfig.model,
        provider: currentConversation.apiConfig.provider,
      });

      const responseMessage: Message = getMessageFromRawResponse(rawResponse);

      setCurrentConversation({
        ...currentConversation,
        replacements,
        messages: [...updatedMessages, responseMessage],
      });
      assistantTelemetry?.reportAssistantMessageSent({
        conversationId: currentConversation.title,
        role: responseMessage.role,
        // TODO before merge to main
        // this will be available once 174126 is merged
        actionTypeId: '.gen-ai', // currentConversation.apiConfig.actionTypeId,
        model: currentConversation.apiConfig.model,
        provider: currentConversation.apiConfig.provider,
        isEnabledKnowledgeBase,
        isEnabledRAGAlerts,
      });
    },
    [
      allSystemPrompts,
      assistantTelemetry,
      currentConversation,
      editingSystemPromptId,
      http,
      isEnabledKnowledgeBase,
      isEnabledRAGAlerts,
      selectedPromptContexts,
      sendMessage,
      setCurrentConversation,
      setPromptTextPreview,
      setSelectedPromptContexts,
      toasts,
    ]
  );

  const handleRegenerateResponse = useCallback(async () => {
    if (!currentConversation.apiConfig) {
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

    const responseMessage: Message = getMessageFromRawResponse(rawResponse);
    setCurrentConversation({
      ...currentConversation,
      messages: [...updatedMessages, responseMessage],
    });
  }, [currentConversation, http, removeLastMessage, sendMessage, setCurrentConversation, toasts]);

  const handleButtonSendMessage = useCallback(
    (message: string) => {
      handleSendMessage(message);
      setUserPrompt('');
    },
    [handleSendMessage, setUserPrompt]
  );

  const handleOnChatCleared = useCallback(async () => {
    const defaultSystemPromptId = getDefaultSystemPrompt({
      allSystemPrompts,
      conversation: currentConversation,
    })?.id;

    setPromptTextPreview('');
    setUserPrompt('');
    setSelectedPromptContexts({});
    const updatedConversation = await clearConversation(currentConversation);
    if (updatedConversation) {
      setCurrentConversation(updatedConversation);
    }
    setEditingSystemPromptId(defaultSystemPromptId);
  }, [
    allSystemPrompts,
    clearConversation,
    currentConversation,
    setCurrentConversation,
    setEditingSystemPromptId,
    setPromptTextPreview,
    setSelectedPromptContexts,
    setUserPrompt,
  ]);

  return {
    handleButtonSendMessage,
    handleOnChatCleared,
    handlePromptChange,
    handleSendMessage,
    handleRegenerateResponse,
    isLoading,
  };
};
