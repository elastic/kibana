/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { ChatEvent } from '@kbn/agent-builder-common';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser/events';
import { ConversationStreamService } from '../../../../../services/events/conversation_stream_service';
import { createExecutionStartedEvent } from '../../timeline/items/execution_started.factory';
import { ConversationActionButton } from './conversation_action_button';
import { useConversationStream } from '../../../../hooks/use_conversation_stream';

const mockChatEvents$ = new Subject<ChatEvent>();
const mockStreamEnded$ = new Subject<void>();
const mockStreamService = new ConversationStreamService({
  getChatEvents$: () => mockChatEvents$.asObservable() as unknown as Observable<BrowserChatEvent>,
  getStreamEnded$: () => mockStreamEnded$.asObservable(),
});

jest.mock('../../../../hooks/use_conversation_stream', () => ({
  useConversationStream: jest.fn(),
}));
jest.mock('../../../../context/conversation/use_conversation_id', () => ({
  useConversationId: () => 'conv-1',
}));
jest.mock('../../../../context/streaming/streaming_context', () => ({
  useConversationStreamService: () => mockStreamService,
}));
jest.mock('@kbn/ebt-click', () => ({ getEbtProps: () => ({}) }));

const mockedUseConversationStream = jest.mocked(useConversationStream);

const defaultStreamState = {
  canCancel: false,
  cancel: jest.fn(),
  pendingMessage: undefined,
  isResuming: false,
  isResponseLoading: false,
  sendMessage: jest.fn(),
};

describe('ConversationActionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Drop any draft a previous test left in the shared service.
    mockStreamEnded$.next();
    mockedUseConversationStream.mockReturnValue(defaultStreamState as never);
  });

  it('renders the submit button when not streaming', () => {
    render(
      <ConversationActionButton
        onSubmit={jest.fn()}
        isSubmitDisabled={false}
        resetToPendingMessage={jest.fn()}
      />
    );
    expect(screen.getByTestId('agentBuilderConversationInputSubmitButton')).toBeInTheDocument();
  });

  it('calls onSubmit when submit button is clicked', () => {
    const onSubmit = jest.fn();
    render(
      <ConversationActionButton
        onSubmit={onSubmit}
        isSubmitDisabled={false}
        resetToPendingMessage={jest.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('agentBuilderConversationInputSubmitButton'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when isSubmitDisabled is true', () => {
    const onSubmit = jest.fn();
    render(
      <ConversationActionButton
        onSubmit={onSubmit}
        isSubmitDisabled={true}
        resetToPendingMessage={jest.fn()}
      />
    );
    const button = screen.getByTestId('agentBuilderConversationInputSubmitButton');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders the cancel button when streaming (canCancel: true)', () => {
    const cancel = jest.fn();
    const resetToPendingMessage = jest.fn();
    mockedUseConversationStream.mockReturnValue({
      ...defaultStreamState,
      canCancel: true,
      cancel,
    } as never);

    render(
      <ConversationActionButton
        onSubmit={jest.fn()}
        isSubmitDisabled={false}
        resetToPendingMessage={resetToPendingMessage}
      />
    );
    // The service only folds events once something observes the conversation.
    act(() => mockChatEvents$.next(createExecutionStartedEvent() as ChatEvent));

    expect(
      screen.queryByTestId('agentBuilderConversationInputSubmitButton')
    ).not.toBeInTheDocument();
    const cancelButton = screen.getByTestId('agentBuilderConversationInputCancelButton');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(resetToPendingMessage).toHaveBeenCalledTimes(1);
  });

  it('keeps the cancel button disabled until execution_started arrives', () => {
    const cancel = jest.fn();
    mockedUseConversationStream.mockReturnValue({
      ...defaultStreamState,
      canCancel: true,
      cancel,
    } as never);

    render(
      <ConversationActionButton
        onSubmit={jest.fn()}
        isSubmitDisabled={true}
        resetToPendingMessage={jest.fn()}
      />
    );
    const button = screen.getByTestId('agentBuilderConversationInputCancelButton');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(cancel).not.toHaveBeenCalled();

    act(() => mockChatEvents$.next(createExecutionStartedEvent() as ChatEvent));
    expect(button).toBeEnabled();
  });
});
