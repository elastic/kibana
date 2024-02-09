/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { getMessageContentWithoutReplacements } from '@kbn/elastic-assistant-common';
import { SelectedPromptContext } from '../prompt_context/types';
import { useSendMessages } from '../use_send_messages';
import { useConversation } from '../use_conversation';
import { getCombinedMessage } from '../prompt/helpers';
import { Conversation, Message, Prompt } from '../../..';
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
  refresh: () => Promise<Conversation | undefined>;
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
  refresh,
  setCurrentConversation,
}: UseChatSendProps): UseChatSend => {
  const { isLoading, sendMessages } = useSendMessages();
  const { clearConversation, removeLastMessage } = useConversation();

  const handlePromptChange = (prompt: string) => {
    setPromptTextPreview(prompt);
    setUserPrompt(prompt);
  };

  // Handles sending latest user prompt to API
  const handleSendMessage = useCallback(
    async (promptText: string) => {
      let replacements: Record<string, string> | undefined;
      const onNewReplacements = (newReplacements: Record<string, string>) => {
        replacements = { ...(currentConversation.replacements ?? {}), ...newReplacements };
        setCurrentConversation({
          ...currentConversation,
          replacements,
        });
      };

      const systemPrompt = allSystemPrompts.find((prompt) => prompt.id === editingSystemPromptId);

      const userMessages = getCombinedMessage({
        isNewChat: currentConversation.messages.length === 0,
        currentReplacements: currentConversation.replacements,
        promptText,
        selectedPromptContexts,
        selectedSystemPrompt: systemPrompt,
        onNewReplacements,
      });

      const updatedMessages = [...currentConversation.messages, ...userMessages];
      setCurrentConversation({
        ...currentConversation,
        messages: updatedMessages.map((m) => ({
          ...m,
          content: getMessageContentWithoutReplacements({
            messageContent: m.content ?? '',
            replacements,
          }),
        })),
      });

      // Reset prompt context selection and preview before sending:
      setSelectedPromptContexts({});
      setPromptTextPreview('');

      const rawResponse = await sendMessages({
        apiConfig: currentConversation.apiConfig,
        http,
        messages: userMessages,
        conversationId: currentConversation.id,
        replacements,
      });

      const responseMessage: Message = getMessageFromRawResponse(rawResponse);

      setCurrentConversation({
        ...currentConversation,
        messages: [...updatedMessages, responseMessage],
      });
    },
    [
      allSystemPrompts,
      currentConversation,
      editingSystemPromptId,
      http,
      selectedPromptContexts,
      sendMessages,
      setCurrentConversation,
      setPromptTextPreview,
      setSelectedPromptContexts,
    ]
  );

  const handleRegenerateResponse = useCallback(async () => {
    await removeLastMessage(currentConversation.id);

    const rawResponse = await sendMessages({
      apiConfig: currentConversation.apiConfig,
      http,
      messages: [],
      conversationId: currentConversation.id,
    });
    const responseMessage: Message = getMessageFromRawResponse(rawResponse);
    setCurrentConversation({
      ...currentConversation,
      messages: [...currentConversation.messages, responseMessage],
    });
  }, [currentConversation, http, removeLastMessage, sendMessages, setCurrentConversation]);

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
    setEditingSystemPromptId(defaultSystemPromptId);
    await clearConversation(currentConversation.id);
    await refresh();
  }, [
    allSystemPrompts,
    clearConversation,
    currentConversation,
    refresh,
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
