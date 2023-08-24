/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { useSendMessages } from '../use_send_messages';
import { useConversation } from '../use_conversation';
import { emptyWelcomeConvo, welcomeConvo } from '../../mock/conversation';
import { defaultSystemPrompt, mockSystemPrompt } from '../../mock/system_prompt';
import { useChatSend, UseChatSendProps } from './use_chat_send';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';

jest.mock('../use_send_messages');
jest.mock('../use_conversation');

const setEditingSystemPromptId = jest.fn();
const setPromptTextPreview = jest.fn();
const setSelectedPromptContexts = jest.fn();
const setUserPrompt = jest.fn();
const sendMessages = jest.fn();
const appendMessage = jest.fn();
const appendReplacements = jest.fn();
const clearConversation = jest.fn();

export const testProps: UseChatSendProps = {
  selectedPromptContexts: {},
  allSystemPrompts: [defaultSystemPrompt, mockSystemPrompt],
  currentConversation: emptyWelcomeConvo,
  http: {
    basePath: {
      basePath: '/mfg',
      serverBasePath: '/mfg',
    },
    anonymousPaths: {},
    externalUrl: {},
  } as unknown as HttpSetup,
  editingSystemPromptId: defaultSystemPrompt.id,
  setEditingSystemPromptId,
  setPromptTextPreview,
  setSelectedPromptContexts,
  setUserPrompt,
};
const robotMessage = 'Response message from the robot';
describe('use chat send', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSendMessages as jest.Mock).mockReturnValue({
      isLoading: false,
      sendMessages: sendMessages.mockReturnValue(robotMessage),
    });
    (useConversation as jest.Mock).mockReturnValue({
      appendMessage,
      appendReplacements,
      clearConversation,
    });
  });
  it('handleOnChatCleared clears the conversation', () => {
    const { result } = renderHook(() => useChatSend(testProps));
    result.current.handleOnChatCleared();
    expect(clearConversation).toHaveBeenCalled();
    expect(setPromptTextPreview).toHaveBeenCalledWith('');
    expect(setUserPrompt).toHaveBeenCalledWith('');
    expect(setSelectedPromptContexts).toHaveBeenCalledWith({});
    expect(clearConversation).toHaveBeenCalledWith(testProps.currentConversation.id);
    expect(setEditingSystemPromptId).toHaveBeenCalledWith(defaultSystemPrompt.id);
  });
  it('handlePromptChange updates prompt successfully', () => {
    const { result } = renderHook(() => useChatSend(testProps));
    result.current.handlePromptChange('new prompt');
    expect(setPromptTextPreview).toHaveBeenCalledWith('new prompt');
    expect(setUserPrompt).toHaveBeenCalledWith('new prompt');
  });
  it('handleButtonSendMessage sends message with context prompt when a valid prompt text is provided', async () => {
    const promptText = 'prompt text';
    const { result } = renderHook(() => useChatSend(testProps));
    result.current.handleButtonSendMessage(promptText);
    expect(setUserPrompt).toHaveBeenCalledWith('');

    await waitFor(() => {
      expect(sendMessages).toHaveBeenCalled();
      const appendMessageSend = appendMessage.mock.calls[0][0];
      const appendMessageResponse = appendMessage.mock.calls[1][0];
      expect(appendMessageSend.message.content).toEqual(
        `You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\n\n\n${promptText}`
      );
      expect(appendMessageSend.message.role).toEqual('user');
      expect(appendMessageResponse.message.content).toEqual(robotMessage);
      expect(appendMessageResponse.message.role).toEqual('assistant');
    });
  });
  it('handleButtonSendMessage sends message with only provided prompt text and context already exists in convo history', async () => {
    const promptText = 'prompt text';
    const { result } = renderHook(() =>
      useChatSend({ ...testProps, currentConversation: welcomeConvo })
    );

    result.current.handleButtonSendMessage(promptText);
    expect(setUserPrompt).toHaveBeenCalledWith('');

    await waitFor(() => {
      expect(sendMessages).toHaveBeenCalled();
      expect(appendMessage.mock.calls[0][0].message.content).toEqual(`\n\n${promptText}`);
    });
  });
});
