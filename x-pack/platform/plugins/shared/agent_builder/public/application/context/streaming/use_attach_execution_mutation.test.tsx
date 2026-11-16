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
import { Subject } from 'rxjs';
import type { ChatEvent, Conversation, ConversationEvent } from '@kbn/agent-builder-common';
import { ChatEventType, TimelineEventType, TimelineTriggerType } from '@kbn/agent-builder-common';
import { ConversationStreamService } from '../../../services/events/conversation_stream_service';
import {
  EXECUTION_STREAMING_EVENT_TYPE,
  type ExecutionStreamingEvent,
  type TimelineDisplayEvent,
} from '../../../services/events/sse_to_events';
import { createExecutionStartedEvent } from '../../components/conversations/timeline/items/execution_started.factory';
import { createExecutionTerminatedEvent } from '../../components/conversations/timeline/items/execution_terminated_event.factory';
import { queryKeys } from '../../query_keys';
import { useAttachExecutionMutation } from './use_attach_execution_mutation';

const mockAttach = jest.fn();
const mockAbort = jest.fn().mockResolvedValue({ acknowledged: true, terminal_persisted: true });
const mockGet = jest.fn();

jest.mock('../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    chatService: { attachToExecution: mockAttach, abort: mockAbort },
    conversationsService: { get: mockGet },
  }),
}));

const conversationId = 'conv-1';
const executionId = 'round-1::execution::1';
const vars = { conversationId, executionId };

const started = createExecutionStartedEvent({
  id: `${executionId}::execution_started`,
  execution_id: executionId,
  trigger_event_id: 'round-1::user_message',
});
const terminated = createExecutionTerminatedEvent({
  id: `${executionId}::execution_terminated`,
  execution_id: executionId,
});
/** The pause of the previous execution, waiting on a confirmation. */
const paused = createExecutionTerminatedEvent({
  id: 'round-1::execution::0::execution_terminated',
  execution_id: 'round-1::execution::0',
  data: {
    ...createExecutionTerminatedEvent().data,
    outcome: {
      type: 'prompt_requested',
      prompts: [{ id: 'confirm', type: 'confirmation', message: 'Proceed?' } as never],
    },
  },
});
const resumeStarted = createExecutionStartedEvent({
  id: `${executionId}::execution_started`,
  execution_id: executionId,
  trigger_event_id: 'round-1::prompt_response::1',
  data: { trigger_type: TimelineTriggerType.promptResponse },
});

const chunk = (text: string): ChatEvent =>
  ({ type: ChatEventType.messageChunk, data: { message_id: 'm', text_chunk: text } } as ChatEvent);

const messageOf = (events: TimelineDisplayEvent[]): string | undefined =>
  events.find(
    (event): event is ExecutionStreamingEvent => event.type === EXECUTION_STREAMING_EVENT_TYPE
  )?.data.message;

const setup = ({ savedEvents = [] }: { savedEvents?: ConversationEvent[] } = {}) => {
  const conversationStreamService = new ConversationStreamService();
  const bindings = {
    conversationStreamService,
    clearActiveStream: jest.fn(),
    markStreamStarted: jest.fn(),
  };
  const source = new Subject<ChatEvent>();
  mockAttach.mockReturnValue(source);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.conversations.byId(conversationId), {
    id: conversationId,
    rounds: [],
    events: savedEvents,
  } as unknown as Conversation);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useAttachExecutionMutation(bindings), { wrapper: Wrapper });
  const observer = conversationStreamService.getActiveStream$(conversationId).subscribe();

  return { bindings, source, result, conversationStreamService, observer };
};

describe('useAttachExecutionMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches to the given execution with its own abort signal', async () => {
    const { result } = setup();

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());

    expect(mockAttach).toHaveBeenCalledWith({
      conversationId,
      executionId,
      signal: expect.any(AbortSignal),
    });
  });

  it('rebuilds the running turn from the replay and marks the stream started', async () => {
    const { bindings, source, result, conversationStreamService } = setup();

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() => {
      source.next(started as ChatEvent);
      source.next(chunk('Hel'));
      source.next(chunk('lo'));
    });

    expect(bindings.markStreamStarted).toHaveBeenCalledWith(conversationId);
    expect(messageOf(conversationStreamService.getSnapshot(conversationId))).toBe('Hello');
  });

  it('releases the live events once the refetch has the saved execution', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [started, terminated] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() => {
      source.next(started as ChatEvent);
      source.next(chunk('Hi'));
      source.next(terminated as ChatEvent);
      source.complete();
    });

    await waitFor(() => expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId));
    await waitFor(() => expect(conversationStreamService.getSnapshot(conversationId)).toEqual([]));
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('records the answer to the open prompt when the replayed run is a resume', async () => {
    const { source, result, conversationStreamService } = setup({ savedEvents: [paused] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() => source.next(resumeStarted as ChatEvent));

    const promptResponse = conversationStreamService
      .getSnapshot(conversationId)
      .find((event) => event.type === TimelineEventType.promptResponse);
    expect(promptResponse).toMatchObject({
      // The saved prompt_response gets this id, so the refetch replaces the local copy.
      id: 'round-1::prompt_response::1',
      data: { prompt_requested_event_id: paused.id, responses: {} },
    });
  });

  it('records no answer when the replayed run is a resume but no prompt is open', async () => {
    const { source, result, conversationStreamService } = setup({ savedEvents: [terminated] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() => source.next(resumeStarted as ChatEvent));

    expect(
      conversationStreamService
        .getSnapshot(conversationId)
        .some((event) => event.type === TimelineEventType.promptResponse)
    ).toBe(false);
  });

  it('records no answer when the replayed run was started by a user message', async () => {
    const { source, result, conversationStreamService } = setup({ savedEvents: [paused] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() => source.next(started as ChatEvent));

    expect(
      conversationStreamService
        .getSnapshot(conversationId)
        .some((event) => event.type === TimelineEventType.promptResponse)
    ).toBe(false);
  });

  it('treats a failed attach as nothing to show: clears the entry and refetches, no error surfaces', async () => {
    const { bindings, source, result } = setup();
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() =>
      source.error(
        Object.assign(new Error('Not Found'), { request: {}, response: { status: 404 } })
      )
    );

    await waitFor(() => expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId));
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(false);
  });

  it('skips the refetch when the connection is closed locally', async () => {
    const { bindings, source, result } = setup();

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() => source.next(started as ChatEvent));
    act(() => {
      result.current.detachAll();
      // The aborted fetch rejects, as core http does once the signal fires.
      source.error(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
    });

    await waitFor(() => expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId));
    expect(mockGet).not.toHaveBeenCalled();
    expect(mockAbort).not.toHaveBeenCalled();
  });

  it('Stop asks the server to abort the execution it attached to', async () => {
    const { source, result } = setup();

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockAttach).toHaveBeenCalled());
    act(() => source.next(started as ChatEvent));
    act(() => result.current.cancel(conversationId));

    expect(mockAbort).toHaveBeenCalledWith(executionId);
  });
});
