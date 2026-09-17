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
import { ChatEventType } from '@kbn/agent-builder-common';
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
const promptRequestedEventId = 'round-1::execution::execution_terminated';
const vars = { prompts: {}, conversationId, agentId: 'agent-1', promptRequestedEventId };
const terminated = createExecutionTerminatedEvent({ execution_id: 'round-1::execution::1' });

const setup = () => {
  const eventsService = new EventsService();
  const conversationStreamService = new ConversationStreamService(eventsService);
  const bindings = { conversationStreamService, setError: jest.fn(), clearActiveStream: jest.fn() };
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

  it('releases the completed draft once the refetch contains the saved execution', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [terminated] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockResume).toHaveBeenCalled());
    act(() => {
      source.next(terminated as ChatEvent);
      source.complete();
    });

    await waitFor(() => expect(conversationStreamService.getSnapshot(conversationId)).toBeNull());
    expect(bindings.clearActiveStream).toHaveBeenCalledWith(conversationId);
    expect(bindings.setError).not.toHaveBeenCalled();
  });

  it('reports the steps and rolls back the optimistic answer when the stream fails unpersisted', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    const clearPromptResponse = jest.spyOn(conversationStreamService, 'clearPromptResponse');
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockResume).toHaveBeenCalled());
    act(() => {
      source.next({ type: ChatEventType.reasoning, data: { reasoning: 'thinking' } } as ChatEvent);
      source.error(new Error('boom'));
    });

    await waitFor(() => expect(bindings.setError).toHaveBeenCalled());
    const [, , steps] = bindings.setError.mock.calls[0];
    expect(steps).toHaveLength(1);
    await waitFor(() =>
      expect(clearPromptResponse).toHaveBeenCalledWith(conversationId, promptRequestedEventId)
    );
  });

  it('keeps the optimistic answer when the failed resume was actually persisted', async () => {
    const { bindings, source, result, conversationStreamService } = setup();
    const clearPromptResponse = jest.spyOn(conversationStreamService, 'clearPromptResponse');
    const persistedResponse = {
      id: 'round-1::prompt_response::1',
      type: 'prompt_response',
      data: { prompt_requested_event_id: promptRequestedEventId, responses: {} },
    };
    mockGet.mockResolvedValue({ id: conversationId, rounds: [], events: [persistedResponse] });

    act(() => result.current.mutate(vars));
    await waitFor(() => expect(mockResume).toHaveBeenCalled());
    act(() => {
      source.next({ type: ChatEventType.reasoning, data: { reasoning: 'thinking' } } as ChatEvent);
      source.error(new Error('boom'));
    });

    await waitFor(() => expect(bindings.setError).toHaveBeenCalled());
    expect(clearPromptResponse).not.toHaveBeenCalled();
  });
});
