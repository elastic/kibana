/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { BehaviorSubject, Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import type { ChatEvent, Conversation, ConversationEvent } from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import type { BrowserChatEvent } from '@kbn/agent-builder-browser/events';
import useObservable from 'react-use/lib/useObservable';
import { ConversationStreamService } from '../../../../services/events/conversation_stream_service';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import type { StreamRecord } from '../../../context/streaming/types';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import { createAttachmentAddedEvent } from './items/attachment_added_event.factory';
import { createVersionedAttachment } from './items/versioned_attachment.factory';
import { CUSTOM_EVENT_TYPE, createCustomEvent } from './items/custom_event.factory';
import type { TimelineItem } from './types';
import { TimelineConnector } from './timeline_connector';

interface MockState {
  conversation?: Conversation;
  record: StreamRecord;
}
const mockStore = {
  state$: new BehaviorSubject<MockState>({ record: {} }),
  // Like the real hooks, the mocks render their caller when the cache or the stream record change.
  useMockState: (): MockState => useObservable(mockStore.state$, mockStore.state$.getValue()),
};

jest.mock('../../../hooks/use_conversation', () => ({
  useConversation: () => ({ conversation: mockStore.useMockState().conversation }),
  useAgentId: () => 'agent-1',
}));
jest.mock('../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({ agent: null }),
}));
jest.mock('../../../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));
jest.mock('../../../context/streaming/streaming_context', () => ({
  useStreamRecord: () => mockStore.useMockState().record,
  useConversationStreamService: () => mockStreamService,
}));
const mockOnConnectorRender = jest.fn();
jest.mock('./screen_reader_status', () => ({
  TimelineScreenReaderStatus: () => {
    mockOnConnectorRender();
    return null;
  },
}));
jest.mock('../../../hooks/use_conversation_stream', () => ({
  useConversationStream: () => ({ isResuming: false }),
}));
jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: {
      hasAttachmentType: (type: string) => registeredAttachmentTypes.has(type),
    },
    conversationEventsService: {
      getUiDefinition: (type: string) =>
        registeredEventTypes.has(type) ? { type, render: () => null } : undefined,
    },
  }),
}));

/** Attachment types with a UI in this test's Kibana; empty unless a test registers one. */
const registeredAttachmentTypes = new Set<string>();
/** Custom event types with a UI in this test's Kibana; empty unless a test registers one. */
const registeredEventTypes = new Set<string>();
const mockList = ({ items }: { items: TimelineItem[] }) => (
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
);
/** Swaps the list for the real `Timeline`, for tests that count how often a turn renders. */
const mockUseRealTimeline = { current: false };
jest.mock('./timeline', () => ({
  Timeline: (props: { items: TimelineItem[] }) =>
    mockUseRealTimeline.current
      ? jest.requireActual('react').createElement(jest.requireActual('./timeline').Timeline, props)
      : mockList(props),
}));
jest.mock('./items/user_message_event', () => ({ UserMessageEvent: () => null }));
jest.mock('./items/attachment_event', () => ({ AttachmentEvent: () => null }));
jest.mock('./items/custom_event', () => ({ CustomEvent: () => null }));
const mockOnTurnRender = jest.fn();
jest.mock('./agent_turn', () => ({
  AgentTurn: jest.requireActual('react').memo(({ item }: { item: TimelineItem }) => {
    mockOnTurnRender(item.key);
    return null;
  }),
}));

const conversationId = 'conv-1';
const chatEvents$ = new Subject<ChatEvent>();
const streamEnded$ = new Subject<void>();
const streamStarted$ = new Subject<string>();
const mockStreamService = new ConversationStreamService({
  getChatEvents$: () => chatEvents$.asObservable() as Observable<BrowserChatEvent>,
  getStreamEnded$: () => streamEnded$.asObservable(),
  getStreamStarted$: () => streamStarted$.asObservable(),
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
  act(() => {
    mockStore.state$.next({
      conversation,
      record: {
        pendingMessage,
        pendingAttachments: withAttachments ? pendingAttachments : undefined,
      },
    });
  });
};

const conversationWith = (events: ConversationEvent[], attachments?: VersionedAttachment[]) =>
  ({ id: conversationId, events, attachments, rounds: [] } as unknown as Conversation);

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
    registeredAttachmentTypes.clear();
    registeredEventTypes.clear();
    mockUseRealTimeline.current = false;
    mockStreamService.clearPersistedExecution(conversationId, 'round-1::execution');
    mockStreamService.clearPersistedExecution(conversationId, 'round-2::execution');
  });

  // `useLiveEvents` tells React about stream updates at most once per animation frame.
  const flushFrame = () =>
    act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });

  const streamCompletedExecution = async () => {
    act(() => {
      chatEvents$.next(started as ChatEvent);
      chatEvents$.next(terminated as ChatEvent);
      streamEnded$.next();
    });
    await flushFrame();
  };

  it('shows a running turn under the message until the stream reports the run started', () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    render(<TimelineConnector />);

    expect(renderedItems()).toEqual([
      'userMessage:pending::user_message:',
      'agentTurn:active:running',
    ]);
  });

  it('keeps the pending message and the finished turn visible after the stream ends', async () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    render(<TimelineConnector />);

    await streamCompletedExecution();

    // `execution_started` renames the local copy to the id the server gave it.
    expect(renderedItems()).toEqual([
      'userMessage:round-1::user_message:',
      'agentTurn:round-1::execution:completed',
    ]);
  });

  it('shows only the saved copies once the fetched events contain them', async () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    render(<TimelineConnector />);
    await streamCompletedExecution();

    setState({
      conversation: conversationWith([savedUserMessage, started, terminated]),
      pendingMessage: 'hello',
    });

    expect(renderedItems()).toEqual([
      'userMessage:round-1::user_message:',
      'agentTurn:round-1::execution:completed',
    ]);
  });

  it('keeps local content when the fetched events do not contain the replacement', async () => {
    setState({ conversation: conversationWith([]), pendingMessage: 'hello' });
    render(<TimelineConnector />);
    await streamCompletedExecution();

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

  it('keeps the staged attachments on the saved message until its refs are saved', async () => {
    setState({
      conversation: conversationWith([]),
      pendingMessage: 'hello',
      withAttachments: true,
    });
    render(<TimelineConnector />);
    act(() => {
      chatEvents$.next(started as ChatEvent);
    });
    await flushFrame();

    // The early fetch returns the saved message without refs.
    setState({
      conversation: conversationWith([savedUserMessage, started]),
      pendingMessage: 'hello',
      withAttachments: true,
    });
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
    expect(renderedItems()[0]).toBe('userMessage:round-1::user_message:saved-1');
  });

  describe('inline attachments', () => {
    const inlineAdded = createAttachmentAddedEvent({ id: 'round-1::attachment_added' });
    const record = createVersionedAttachment({ id: inlineAdded.data.attachment_id });

    it('shows the card once a refetch brings the event and its record', () => {
      registeredAttachmentTypes.add(record.type);
      setState({ conversation: conversationWith([savedUserMessage, started, terminated]) });
      render(<TimelineConnector />);
      expect(renderedItems()).toHaveLength(2);

      setState({
        conversation: conversationWith(
          [savedUserMessage, started, terminated, inlineAdded],
          [record]
        ),
      });

      expect(renderedItems()).toEqual([
        'userMessage:round-1::user_message:',
        'agentTurn:round-1::execution:completed',
        'attachment:round-1::attachment_added:',
      ]);
    });

    it('shows nothing for the event when its type has no UI here', () => {
      setState({
        conversation: conversationWith(
          [savedUserMessage, started, terminated, inlineAdded],
          [record]
        ),
      });
      render(<TimelineConnector />);

      expect(renderedItems()).toEqual([
        'userMessage:round-1::user_message:',
        'agentTurn:round-1::execution:completed',
      ]);
    });

    it('shows nothing for the event when the record is gone', () => {
      registeredAttachmentTypes.add(record.type);
      setState({
        conversation: conversationWith([savedUserMessage, started, terminated, inlineAdded], []),
      });
      render(<TimelineConnector />);

      expect(renderedItems()).toHaveLength(2);
    });
  });

  describe('custom events', () => {
    const note = createCustomEvent({ id: 'note-1' });

    it('shows the event once a refetch brings it and its type has a UI here', () => {
      registeredEventTypes.add(CUSTOM_EVENT_TYPE);
      setState({ conversation: conversationWith([savedUserMessage, started, terminated]) });
      render(<TimelineConnector />);
      expect(renderedItems()).toHaveLength(2);

      setState({ conversation: conversationWith([savedUserMessage, started, terminated, note]) });

      expect(renderedItems()).toEqual([
        'userMessage:round-1::user_message:',
        'agentTurn:round-1::execution:completed',
        'customEvent:note-1:',
      ]);
    });

    it('shows nothing for the event when its type has no UI here', () => {
      setState({ conversation: conversationWith([savedUserMessage, started, terminated, note]) });
      render(<TimelineConnector />);

      expect(renderedItems()).toEqual([
        'userMessage:round-1::user_message:',
        'agentTurn:round-1::execution:completed',
      ]);
    });
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

  describe('rendering cost', () => {
    it('does not render again when its parent renders with the same props', async () => {
      setState({ conversation: conversationWith([savedUserMessage, started, terminated]) });
      const { rerender } = render(<TimelineConnector />);
      await flushFrame();
      const rendersBefore = mockOnConnectorRender.mock.calls.length;

      rerender(<TimelineConnector />);

      expect(mockOnConnectorRender).toHaveBeenCalledTimes(rendersBefore);
    });
  });

  describe('rendering cost while a later turn streams', () => {
    const turnRenderCount = (key: string) =>
      mockOnTurnRender.mock.calls.filter(([renderedKey]) => renderedKey === key).length;

    const chunk = (text_chunk: string) =>
      ({ type: 'message_chunk', data: { message_id: 'm', text_chunk } } as unknown as ChatEvent);

    it('does not render the saved turns again for every streamed event', async () => {
      mockUseRealTimeline.current = true;
      setState({
        conversation: conversationWith([savedUserMessage, started, terminated]),
        pendingMessage: 'second question',
      });
      render(<TimelineConnector />);
      expect(turnRenderCount('round-1::execution')).toBe(1);

      act(() => {
        chatEvents$.next(
          createExecutionStartedEvent({
            id: 'round-2::execution_started',
            execution_id: 'round-2::execution',
            trigger_event_id: 'round-2::user_message',
          }) as ChatEvent
        );
        chatEvents$.next(chunk('Hello'));
      });
      await flushFrame();
      const streamingRendersBefore = turnRenderCount('round-2::execution');
      act(() => {
        chatEvents$.next(chunk(' there'));
      });
      await flushFrame();

      expect(turnRenderCount('round-2::execution')).toBeGreaterThan(streamingRendersBefore);
      expect(turnRenderCount('round-1::execution')).toBe(1);
    });
  });
});
