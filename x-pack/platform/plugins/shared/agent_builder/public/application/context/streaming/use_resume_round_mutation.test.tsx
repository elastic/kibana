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
const mockAbort = jest.fn().mockResolvedValue({ acknowledged: true, terminal_persisted: true });
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
const vars = { prompts: {}, conversationId, agentId: 'agent-1' };
const terminated = createExecutionTerminatedEvent({ execution_id: 'round-1::execution::1' });

const setup = () => {
  const eventsService = new EventsService();
  const conversationStreamService = new ConversationStreamService(eventsService);
  const bindings = {
    conversationStreamService,
    clearActiveStream: jest.fn(),
    markStreamStarted: jest.fn(),
  };
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
});
