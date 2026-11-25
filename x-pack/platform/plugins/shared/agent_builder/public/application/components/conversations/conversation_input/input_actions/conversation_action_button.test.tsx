/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationActionButton } from './conversation_action_button';
import { useConversationStream } from '../../../../hooks/use_conversation_stream';

jest.mock('../../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));
jest.mock('@kbn/ebt-click', () => ({ getEbtProps: () => ({}) }));

const mockedUseConversationStream = jest.mocked(useConversationStream);

const defaultStreamState = {
  canCancel: false,
  cancel: jest.fn(),
  isCancelling: false,
  pendingMessage: undefined,
  isResuming: false,
  isResponseLoading: false,
  sendMessage: jest.fn(),
};

describe('ConversationActionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseConversationStream.mockReturnValue(defaultStreamState as never);
  });

  it('renders the submit button when not streaming', () => {
    render(<ConversationActionButton onSubmit={jest.fn()} isSubmitDisabled={false} />);
    expect(screen.getByTestId('agentBuilderConversationInputSubmitButton')).toBeInTheDocument();
  });

  it('calls onSubmit when submit button is clicked', () => {
    const onSubmit = jest.fn();
    render(<ConversationActionButton onSubmit={onSubmit} isSubmitDisabled={false} />);
    fireEvent.click(screen.getByTestId('agentBuilderConversationInputSubmitButton'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when isSubmitDisabled is true', () => {
    const onSubmit = jest.fn();
    render(<ConversationActionButton onSubmit={onSubmit} isSubmitDisabled={true} />);
    const button = screen.getByTestId('agentBuilderConversationInputSubmitButton');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the cancel button loading and disabled while the server stops the run', () => {
    mockedUseConversationStream.mockReturnValue({
      ...defaultStreamState,
      canCancel: true,
      isCancelling: true,
    } as never);

    render(<ConversationActionButton onSubmit={jest.fn()} isSubmitDisabled={false} />);

    expect(screen.getByTestId('agentBuilderConversationInputCancelButton')).toBeDisabled();
  });

  it('renders the cancel button when streaming (canCancel: true)', () => {
    const cancel = jest.fn();
    mockedUseConversationStream.mockReturnValue({
      ...defaultStreamState,
      canCancel: true,
      cancel,
    } as never);

    render(<ConversationActionButton onSubmit={jest.fn()} isSubmitDisabled={false} />);
    expect(
      screen.queryByTestId('agentBuilderConversationInputSubmitButton')
    ).not.toBeInTheDocument();
    const cancelButton = screen.getByTestId('agentBuilderConversationInputCancelButton');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});
