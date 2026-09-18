/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of, Subject } from 'rxjs';
import type { ChatEvent, Conversation } from '@kbn/agent-builder-common';
import { ChatEventType, TimelineEventType } from '@kbn/agent-builder-common';
import { EventsService } from '../../../services/events/events_service';
import { ConversationStreamService } from '../../../services/events/conversation_stream_service';
import { propagateEvents } from '../../../services/chat/propagate_events';
import { createExecutionStartedEvent } from '../../components/conversations/timeline/items/execution_started.factory';
import { createExecutionTerminatedEvent } from '../../components/conversations/timeline/items/execution_terminated_event.factory';
import { createUserMessageEvent } from '../../components/conversations/timeline/items/user_message_event.factory';
import { queryKeys } from '../../query_keys';
import { useSendMessageMutation } from './use_send_message_mutation';

const mockChat = jest.fn();
const mockAbort = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn();

jest.mock('../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    chatService: { chat: mockChat, abort: mockAbort },
    conversationsService: { get: mockGet },
  }),
}));
const mockServices = {
  application: { currentAppId$: of(undefined) },
  plugins: {},
  notifications: {},
};
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: mockServices }),
}));

const conversationId = 'conv-1';
const vars = { message: 'hello', conversationId, agentId: 'agent-1' };

const started = createExecutionStartedEvent({
  execution_id: 'round-1::execution',
  trigger_event_id: 'round-1::user_message',
});
const terminated = createExecutionTerminatedEvent({
  execution_id: 'round-1::execution',
  trigger_event_id: 'round-1::user_message',
});
const savedUserMessage = createUserMessageEvent({ id: 'round-1::user_message' });

const savedConversation = (events: Conversation['events']) =>
  ({ id: conversationId, rounds: [], events } as unknown as Conversation);

const setup = () => {
  const eventsService = new EventsService();
  const conversationStreamService = new ConversationStreamService(eventsService);
  const bindings = {
    conversationStreamService,
    setPendingMessage: jest.fn(),
    clearPendingMessage: jest.fn(),
    clearActiveStream: jest.fn(),
  };
  const source = new Subject<ChatEvent>();
  mockChat.mockReturnValue(source.pipe(propagateEvents({ eventsService, conversationId })));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.conversations.byId(conversationId), savedConversation([]));
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSendMessageMutation(bindings), { wrapper: Wrapper });
  // Keep the live events observed so they are retained until released.
  const observer = conversationStreamService.getActiveStream$(conversationId).subscribe();

  return { bindings, source, result, conversationStreamService, observer, queryClient };
};

const streamToCompletion = (source: Subject<ChatEvent>) => {
  source.next(started as ChatEvent);
  source.next({
    type: ChatEventType.messageChunk,
    data: { message_id: 'm', text_chunk: 'Hi' },
  } as ChatEvent);
  source.next(terminated as ChatEvent);
  source.complete();
};

describe('useSendMessageMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records the staged attachments with the pending message, not the screen context', async () => {
    const { bindings, result } = setup();
    const attachment = { id: 'a-1', type: 'text', data: { content: 'hello' } };

    act(() => result.current.mutate({ ...vars, attachments: [attachment] }));
    await waitFor(() => expect(mockChat).toHaveBeenCalled());

    expect(bindings.setPendingMessage).toHaveBeenCalledWith(conversationId, 'hello', {
      fallbackAttachments: [expect.objectContaining({ id: 'a-1', data: { content: 'hello' } })],
      attachmentRefs: [expect.objectContaining({ attachment_id: 'a-1', version: 1 })],
    });
  });

  it('releases the pending message and live events once the refetch has their saved copies', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue(savedConversation([savedUserMessage, started, terminated]));

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockChat).toHaveBeenCalled());
    act(() => streamToCompletion(source));

    await waitFor(() => expect(bindings.clearPendingMessage).toHaveBeenCalledWith(conversationId));
    expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId);
    expect(conversationStreamService.getSnapshot(conversationId)).toEqual([]);
  });

  it('keeps the pending message and live events when the refetch lacks the saved copies', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue(savedConversation([createUserMessageEvent({ id: 'other' })]));

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockChat).toHaveBeenCalled());
    act(() => streamToCompletion(source));

    await waitFor(() => expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId));
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    await act(async () => {});
    expect(bindings.clearPendingMessage).not.toHaveBeenCalled();
    expect(
      conversationStreamService
        .getSnapshot(conversationId)
        .some((event) => event.type === TimelineEventType.executionTerminated)
    ).toBe(true);
  });

  it('clears the pending message when the refetch fails', async () => {
    const { bindings, source, result } = setup();
    mockGet.mockRejectedValue(new Error('refresh failed'));

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockChat).toHaveBeenCalled());
    act(() => streamToCompletion(source));

    await waitFor(() => expect(bindings.clearPendingMessage).toHaveBeenCalledWith(conversationId));
  });

  it('ends a stream that errors like a completed one: refetch, then release', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue(savedConversation([savedUserMessage, started, terminated]));

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockChat).toHaveBeenCalled());
    act(() => {
      source.next(started as ChatEvent);
      source.next({ type: ChatEventType.reasoning, data: { reasoning: 'thinking' } } as ChatEvent);
      source.error(new Error('boom'));
    });

    await waitFor(() => expect(bindings.clearPendingMessage).toHaveBeenCalledWith(conversationId));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId);
    expect(conversationStreamService.getSnapshot(conversationId)).toEqual([]);
  });
});
