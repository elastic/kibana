/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import { PromptResponse, Replacements } from '@kbn/elastic-assistant-common';
import type { ClientMessage } from '../../assistant_context/types';
import { SelectedPromptContext } from '../prompt_context/types';
import { useSendMessage } from '../use_send_message';
import { useConversation } from '../use_conversation';
import { getCombinedMessage } from '../prompt/helpers';
import { Conversation, useAssistantContext } from '../../..';
import { getMessageFromRawResponse } from '../helpers';
import { getDefaultSystemPrompt, getDefaultNewSystemPrompt } from '../use_conversation/helpers';

export interface UseChatSendProps {
  allSystemPrompts: PromptResponse[];
  currentConversation?: Conversation;
  editingSystemPromptId: string | undefined;
  http: HttpSetup;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setEditingSystemPromptId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
  setUserPrompt: React.Dispatch<React.SetStateAction<string | null>>;
  setCurrentConversation: React.Dispatch<React.SetStateAction<Conversation | undefined>>;
}

export interface UseChatSend {
  abortStream: () => void;
  handleOnChatCleared: () => Promise<void>;
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
  setSelectedPromptContexts,
  setUserPrompt,
  setCurrentConversation,
}: UseChatSendProps): UseChatSend => {
  const { assistantTelemetry, toasts } = useAssistantContext();

  const { isLoading, sendMessage, abortStream } = useSendMessage();
  const { clearConversation, removeLastMessage } = useConversation();

  const handlePromptChange = (prompt: string) => {
    setUserPrompt(prompt);
  };

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
      const systemPrompt = allSystemPrompts.find((prompt) => prompt.id === editingSystemPromptId);

      const userMessage = getCombinedMessage({
        isNewChat: currentConversation.messages.length === 0,
        currentReplacements: currentConversation.replacements,
        promptText,
        selectedPromptContexts,
        selectedSystemPrompt: systemPrompt,
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
      });
    },
    [
      allSystemPrompts,
      assistantTelemetry,
      currentConversation,
      editingSystemPromptId,
      http,
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

  const handleOnChatCleared = useCallback(async () => {
    const defaultSystemPromptId =
      getDefaultSystemPrompt({
        allSystemPrompts,
        conversation: currentConversation,
      })?.id ?? getDefaultNewSystemPrompt(allSystemPrompts)?.id;

    setUserPrompt('');
    setSelectedPromptContexts({});
    if (currentConversation) {
      const updatedConversation = await clearConversation(currentConversation);
      if (updatedConversation) {
        setCurrentConversation(updatedConversation);
      }
    }
    setEditingSystemPromptId(defaultSystemPromptId);
  }, [
    allSystemPrompts,
    clearConversation,
    currentConversation,
    setCurrentConversation,
    setEditingSystemPromptId,
    setSelectedPromptContexts,
    setUserPrompt,
  ]);

  return {
    abortStream,
    handleOnChatCleared,
    handlePromptChange,
    handleSendMessage,
    handleRegenerateResponse,
    isLoading,
  };
};
