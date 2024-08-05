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

jest.mock('./use_chat_send');

const handlePromptChange = jest.fn();
const handleSendMessage = jest.fn();
const handleRegenerateResponse = jest.fn();
const testProps: Props = {
  handlePromptChange,
  handleSendMessage,
  handleRegenerateResponse,
  isLoading: false,
  isDisabled: false,
  shouldRefocusPrompt: false,
  userPrompt: '',
};
describe('ChatSend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(handleSendMessage).toHaveBeenCalledWith(promptText);
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
