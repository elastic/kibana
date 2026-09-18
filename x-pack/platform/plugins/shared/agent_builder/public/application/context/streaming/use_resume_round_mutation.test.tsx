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
import type { ChatEvent, Conversation } from '@kbn/agent-builder-common';
import { EventsService } from '../../../services/events/events_service';
import { ConversationStreamService } from '../../../services/events/conversation_stream_service';
import { propagateEvents } from '../../../services/chat/propagate_events';
import { createExecutionTerminatedEvent } from '../../components/conversations/timeline/items/execution_terminated_event.factory';
import { queryKeys } from '../../query_keys';
import { useResumeRoundMutation } from './use_resume_round_mutation';

const mockResume = jest.fn();
const mockAbort = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn();

jest.mock('../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    chatService: { resume: mockResume, abort: mockAbort },
    conversationsService: { get: mockGet },
  }),
}));
jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { plugins: {}, notifications: {} } }),
}));

const conversationId = 'conv-1';
const pausedExecutionId = 'round-1::execution';
/** The id the server gives the answer that resumes `round-1::execution`. */
const savedAnswerId = 'round-1::prompt_response::1';
const vars = {
  prompts: {},
  promptRequestedEventId: 'round-1::execution_terminated',
  pausedExecutionId,
  conversationId,
  agentId: 'agent-1',
};
const terminated = createExecutionTerminatedEvent({ execution_id: 'round-1::execution::1' });

const setup = () => {
  const eventsService = new EventsService();
  const conversationStreamService = new ConversationStreamService(eventsService);
  const bindings = { conversationStreamService, clearActiveStream: jest.fn() };
  const source = new Subject<ChatEvent>();
  mockResume.mockReturnValue(source.pipe(propagateEvents({ eventsService, conversationId })));

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.conversations.byId(conversationId), {
    id: conversationId,
    rounds: [],
  } as unknown as Conversation);
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useResumeRoundMutation(bindings), { wrapper: Wrapper });
  conversationStreamService.getActiveStream$(conversationId).subscribe();

  return { bindings, source, result, conversationStreamService };
};

describe('useResumeRoundMutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('releases the live events once the refetch contains the saved execution', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [terminated] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockResume).toHaveBeenCalled());
    act(() => {
      source.next(terminated as ChatEvent);
      source.complete();
    });

    await waitFor(() => expect(conversationStreamService.getSnapshot(conversationId)).toEqual([]));
    expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId);
  });

  it('ends a stream that errors like a completed one: refetch, then release', async () => {
    const { bindings, source, result } = setup();
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockResume).toHaveBeenCalled());
    act(() => source.error(new Error('boom')));

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId);
  });

  it('shows the answer right away, under the id the saved copy will have', async () => {
    const { source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [] });

    act(() => result.current.mutate({ ...vars, prompts: { 'prompt-1': { allow: true } } }));

    await waitFor(() => {
      const answer = conversationStreamService
        .getSnapshot(conversationId)
        .find((event) => event.id === savedAnswerId);
      expect(answer).toMatchObject({
        type: 'prompt_response',
        data: {
          prompt_requested_event_id: vars.promptRequestedEventId,
          responses: { 'prompt-1': { allow: true } },
        },
      });
    });

    act(() => source.complete());
  });

  it('takes the answer back when the resume never started', async () => {
    const { source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockResume).toHaveBeenCalled());
    act(() => source.error(new Error('boom')));

    await waitFor(() => expect(conversationStreamService.getSnapshot(conversationId)).toEqual([]));
  });
});
