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
import type { TimelineItem } from './types';
import { TimelineConnector } from './timeline_connector';

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: jest.fn(),
  useAgentId: () => 'agent-1',
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
jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: () => ({ isResuming: false }),
}));
jest.mock('./timeline', () => ({
  Timeline: ({ items }: { items: TimelineItem[] }) => (
    <ul>
      {items.map((item) => (
        <li key={item.key} data-test-subj="item">
          {item.kind}:{item.key}:
          {item.kind === 'agentTurn'
            ? item.status
            : item.kind === 'userMessage'
            ? (item.event.data.attachment_refs ?? []).map((ref) => ref.attachment_id).join(',')
            : ''}
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

const pendingAttachments = {
  fallbackAttachments: [{ id: 'a-1', type: 'text', data: { content: 'hello' } }],
  attachmentRefs: [{ attachment_id: 'a-1', version: 1 }],
};

const setState = ({
  conversation,
  pendingMessage,
  withAttachments = false,
}: {
  conversation?: Conversation;
  pendingMessage?: string;
  withAttachments?: boolean;
}) => {
  jest.mocked(useConversationId).mockReturnValue(conversationId);
  jest
    .mocked(useConversation)
    .mockReturnValue({ conversation } as ReturnType<typeof useConversation>);
  jest.mocked(useStreamRecord).mockReturnValue({
    pendingMessage,
    pendingAttachments: withAttachments ? pendingAttachments : undefined,
  });
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

  it('shows a running turn under the message until the stream reports the run started', () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    render(<TimelineConnector />);

    expect(renderedItems()).toEqual([
      'userMessage:pending::user_message:',
      'agentTurn:active:running',
    ]);
  });

  it('keeps the pending message and the finished turn visible after the stream ends', () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    render(<TimelineConnector />);

    streamCompletedExecution();

    // `execution_started` renames the local copy to the id the server gave it.
    expect(renderedItems()).toEqual([
      'userMessage:round-1::user_message:',
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
      'userMessage:round-1::user_message:',
      'agentTurn:round-1::execution:completed',
    ]);
  });

  it('shows the staged attachments on the pending message', () => {
    setState({
      conversation: conversationWith([]),
      pendingMessage: 'hello',
      withAttachments: true,
    });
    render(<TimelineConnector />);

    expect(renderedItems()[0]).toBe('userMessage:pending::user_message:a-1');
  });

  it('keeps the staged attachments on the saved message until its refs are saved', () => {
    setState({
      conversation: conversationWith([]),
      pendingMessage: 'hello',
      withAttachments: true,
    });
    const { rerender } = render(<TimelineConnector />);
    act(() => {
      chatEvents$.next(started as ChatEvent);
    });

    // The early fetch returns the saved message without refs.
    setState({
      conversation: conversationWith([savedUserMessage, started]),
      pendingMessage: 'hello',
      withAttachments: true,
    });
    rerender(<TimelineConnector />);
    expect(renderedItems()[0]).toBe('userMessage:round-1::user_message:a-1');

    // The completion refetch carries the refs; the local copy is no longer used.
    setState({
      conversation: conversationWith([
        createUserMessageEvent({
          id: 'round-1::user_message',
          data: { message: 'hello', attachment_refs: [{ attachment_id: 'saved-1', version: 1 }] },
        }),
        started,
      ]),
      pendingMessage: 'hello',
      withAttachments: true,
    });
    rerender(<TimelineConnector />);
    expect(renderedItems()[0]).toBe('userMessage:round-1::user_message:saved-1');
  });

  it('observes the live events of a conversation that has not been fetched yet', () => {
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
      'userMessage:round-1::user_message:',
      'agentTurn:round-1::execution:running',
    ]);
  });
});
