/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { ChatEvent, Conversation, TimelineEvent } from '@kbn/agent-builder-common';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser/events';
import { ConversationStreamService } from '../../../../services/events/conversation_stream_service';
import { useConversation } from '../../../hooks/use_conversation';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useStreamRecord } from '../../../context/streaming/streaming_context';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import type { TimelineItem } from './to_timeline_items';
import { TimelineConnector } from './timeline_connector';

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: jest.fn(),
  useAgentId: () => 'agent-1',
  useConversationReadOnly: () => ({ isReadOnly: false, isLoading: false }),
}));
jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: () => ({
    resumeRound: jest.fn(),
    isResuming: false,
    isStreaming: false,
  }),
}));
jest.mock('../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({ agent: null }),
}));
jest.mock('../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));
jest.mock('../../../context/streaming/streaming_context', () => ({
  useStreamRecord: jest.fn(),
  useConversationStreamService: () => mockStreamService,
}));
jest.mock('../conversation_rounds/rounds_screen_reader_status', () => ({
  RoundsScreenReaderStatus: () => null,
}));
jest.mock('./timeline', () => ({
  Timeline: ({ items }: { items: TimelineItem[] }) => (
    <ul>
      {items.map((item) => (
        <li key={item.key} data-test-subj="item">
          {item.kind}:{item.key}:{item.kind === 'agentTurn' ? item.status : ''}
        </li>
      ))}
    </ul>
  ),
}));

const conversationId = 'conv-1';
const chatEvents$ = new Subject<ChatEvent>();
const streamEnded$ = new Subject<void>();
const mockStreamService = new ConversationStreamService({
  getChatEvents$: () => chatEvents$.asObservable() as Observable<BrowserChatEvent>,
  getStreamEnded$: () => streamEnded$.asObservable(),
});

const setState = ({
  conversation,
  pendingMessage,
}: {
  conversation?: Conversation;
  pendingMessage?: string;
}) => {
  jest.mocked(useConversationId).mockReturnValue(conversationId);
  jest
    .mocked(useConversation)
    .mockReturnValue({ conversation } as ReturnType<typeof useConversation>);
  jest.mocked(useStreamRecord).mockReturnValue({ pendingMessage });
};

const conversationWith = (events: TimelineEvent[]) =>
  ({ id: conversationId, events, rounds: [] } as unknown as Conversation);

const renderedItems = () => screen.getAllByTestId('item').map((el) => el.textContent);

const started = createExecutionStartedEvent({
  id: 'round-1::execution_started',
  execution_id: 'round-1::execution',
  trigger_event_id: 'round-1::user_message',
});
const terminated = createExecutionTerminatedEvent({
  id: 'round-1::execution_terminated',
  execution_id: 'round-1::execution',
  trigger_event_id: 'round-1::user_message',
});
const savedUserMessage = createUserMessageEvent({ id: 'round-1::user_message' });

describe('TimelineConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStreamService.clearPersistedExecution(conversationId, 'round-1::execution');
  });

  const streamCompletedExecution = () => {
    act(() => {
      chatEvents$.next(started as ChatEvent);
      chatEvents$.next(terminated as ChatEvent);
      streamEnded$.next();
    });
  };

  it('keeps the pending message and completed draft visible after the stream ends', () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    render(<TimelineConnector />);

    streamCompletedExecution();

    expect(renderedItems()).toEqual([
      'userMessage:pending::user_message:',
      'agentTurn:round-1::execution:completed',
    ]);
  });

  it('shows only the saved copies once the fetched events contain them', () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    const { rerender } = render(<TimelineConnector />);
    streamCompletedExecution();

    setState({
      conversation: conversationWith([savedUserMessage, started, terminated]),
      pendingMessage: 'hello',
    });
    rerender(<TimelineConnector />);

    expect(renderedItems()).toEqual([
      'userMessage:round-1::user_message:',
      'agentTurn:round-1::execution:completed',
    ]);
  });

  it('keeps local content when the fetched events do not contain the replacement', () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    const { rerender } = render(<TimelineConnector />);
    streamCompletedExecution();

    const olderUserMessage = createUserMessageEvent({ id: 'round-0::user_message' });
    const olderTerminated = createExecutionTerminatedEvent({
      id: 'round-0::execution_terminated',
      execution_id: 'round-0::execution',
      trigger_event_id: 'round-0::user_message',
    });
    setState({
      conversation: conversationWith([olderUserMessage, olderTerminated]),
      pendingMessage: 'hello',
    });
    rerender(<TimelineConnector />);

    expect(renderedItems()).toEqual([
      'userMessage:round-0::user_message:',
      'agentTurn:round-0::execution:completed',
      'userMessage:pending::user_message:',
      'agentTurn:round-1::execution:completed',
    ]);
  });

  it('observes the live draft for a conversation that has not been fetched yet', () => {
    setState({ conversation: undefined, pendingMessage: 'hello' });
    render(<TimelineConnector />);

    act(() => {
      chatEvents$.next(started as ChatEvent);
      chatEvents$.next({
        type: 'message_chunk',
        data: { message_id: 'm', text_chunk: 'Hi' },
      } as unknown as ChatEvent);
    });

    expect(renderedItems()).toEqual([
      'userMessage:pending::user_message:',
      'agentTurn:round-1::execution:running',
    ]);
  });
});
