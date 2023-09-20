/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { ChatSend, Props } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { useChatSend } from './use_chat_send';
import { defaultSystemPrompt, mockSystemPrompt } from '../../mock/system_prompt';
import { emptyWelcomeConvo } from '../../mock/conversation';
import { HttpSetup } from '@kbn/core-http-browser';

jest.mock('./use_chat_send');

const testProps: Props = {
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
  setEditingSystemPromptId: () => {},
  setPromptTextPreview: () => {},
  setSelectedPromptContexts: () => {},
  setUserPrompt: () => {},
  isDisabled: false,
  shouldRefocusPrompt: false,
  userPrompt: '',
};
const handleButtonSendMessage = jest.fn();
const handleOnChatCleared = jest.fn();
const handlePromptChange = jest.fn();
const handleSendMessage = jest.fn();
const chatSend = {
  handleButtonSendMessage,
  handleOnChatCleared,
  handlePromptChange,
  handleSendMessage,
  isLoading: false,
};

describe('ChatSend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useChatSend as jest.Mock).mockReturnValue(chatSend);
  });
  it('the prompt updates when the text area changes', async () => {
    const { getByTestId } = render(<ChatSend {...testProps} />, {
      wrapper: TestProviders,
    });
    const promptTextArea = getByTestId('prompt-textarea');
    const promptText = 'valid prompt text';
    fireEvent.change(promptTextArea, { target: { value: promptText } });
    expect(handlePromptChange).toHaveBeenCalledWith(promptText);
  });

  it('a message is sent when send button is clicked', async () => {
    const promptText = 'valid prompt text';
    const { getByTestId } = render(<ChatSend {...testProps} userPrompt={promptText} />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('prompt-textarea')).toHaveTextContent(promptText);
    fireEvent.click(getByTestId('submit-chat'));
    await waitFor(() => {
      expect(handleButtonSendMessage).toHaveBeenCalledWith(promptText);
    });
  });

  it('promptValue is set to empty string if isDisabled=true', async () => {
    const promptText = 'valid prompt text';
    const { getByTestId } = render(<ChatSend {...testProps} userPrompt={promptText} isDisabled />, {
      wrapper: TestProviders,
    });
    expect(getByTestId('prompt-textarea')).toHaveTextContent('');
  });
});
