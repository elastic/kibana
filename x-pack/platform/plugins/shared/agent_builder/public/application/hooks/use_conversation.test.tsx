/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { Conversation, ConversationAccessControl } from '@kbn/agent-builder-common';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  ConversationRoundStatus,
} from '@kbn/agent-builder-common';
import { NEVER } from 'rxjs';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { useStreamingContext, useStreamRecord } from '../context/streaming/streaming_context';
import { ConversationStreamService } from '../../services/events/conversation_stream_service';
import { queryKeys } from '../query_keys';
import { createPromptRequestedTerminatedEvent } from '../components/conversations/timeline/items/execution_terminated_event.factory';
import {
  useConversation,
  useConversationReadOnly,
  useIsUnpersistedConversation,
} from './use_conversation';

jest.mock('../context/conversation/use_conversation_id', () => ({
  useConversationId: jest.fn(),
}));

jest.mock('../context/streaming/streaming_context', () => ({
  useStreamingContext: jest.fn(),
  useStreamRecord: jest.fn(),
}));

const mockGet = jest.fn();

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({ conversationsService: { get: mockGet } }),
}));

jest.mock('../context/conversation/conversation_context', () => ({
  useConversationContext: () => ({}),
}));

jest.mock('./use_last_agent_id', () => ({
  useLastAgentId: () => ({ agentId: undefined }),
}));

const stubConversationStreamService = new ConversationStreamService({
  getChatEvents$: () => NEVER,
  getStreamEnded$: () => NEVER,
});

const mockUseConversationId = jest.mocked(useConversationId);
const mockUseStreamingContext = jest.mocked(useStreamingContext);
const mockUseStreamRecord = jest.mocked(useStreamRecord);

const createConversation = (roundIds: string[]) =>
  ({
    id: 'conversation-1',
    rounds: roundIds.map((id) => ({ id })),
  } as Conversation);

const renderUseIsUnpersistedConversation = ({
  conversation,
  isStreaming = false,
  pendingMessage,
  error,
}: {
  conversation?: Conversation;
  isStreaming?: boolean;
  pendingMessage?: string;
  error?: Error;
} = {}) => {
  mockUseConversationId.mockReturnValue('conversation-1');
  mockUseStreamingContext.mockReturnValue({
    activeStreams: isStreaming ? new Map([['conversation-1', { type: 'send' }]]) : new Map(),
    byConversationId: {},
    conversationStreamService: stubConversationStreamService,
    mutateSendMessage: jest.fn(),
    mutateResumeRound: jest.fn(),
    cancelStream: jest.fn(),
    cancelAllStreams: jest.fn(),
    removeError: jest.fn(),
    removeAllErrors: jest.fn(),
  });
  mockUseStreamRecord.mockReturnValue({
    pendingMessage,
    error,
    errorSteps: [],
  });

  return renderHook(() => useIsUnpersistedConversation(conversation));
};

describe('useIsUnpersistedConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true while a new conversation streams before it has been fetched', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: undefined,
      isStreaming: true,
    });

    expect(result.current).toBe(true);
  });

  it('returns true after an unpersisted new conversation stream fails', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: undefined,
      pendingMessage: 'hello',
      error: new Error('boom'),
    });

    expect(result.current).toBe(true);
  });

  it('returns false during later streams on persisted conversations', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: createConversation(['round-1']),
      isStreaming: true,
    });

    expect(result.current).toBe(false);
  });

  it('returns false for persisted conversations with rounds after stream errors', () => {
    const { result } = renderUseIsUnpersistedConversation({
      conversation: createConversation(['round-1']),
      pendingMessage: 'hello',
      error: new Error('boom'),
    });

    expect(result.current).toBe(false);
  });
});

const conversationId = 'conversation-1';

const privateAcl: ConversationAccessControl = {
  access_mode: ConversationAccessControlMode.Private,
  entries: [],
};

const sharedAcl: ConversationAccessControl = {
  access_mode: ConversationAccessControlMode.Private,
  entries: [
    {
      type: 'user',
      id: 'alice-profile-id',
      role: ConversationAccessControlRole.Member,
      added_at: '2026-06-29T00:00:00.000Z',
    },
  ],
};

const publicAcl: ConversationAccessControl = {
  access_mode: ConversationAccessControlMode.Public,
  entries: [],
};

const createFetchedConversation = (accessControl?: ConversationAccessControl) =>
  ({
    id: conversationId,
    rounds: [{ id: 'round-1', status: ConversationRoundStatus.completed }],
    ...(accessControl ? { access_control: accessControl } : {}),
  } as Conversation);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { queryClient, Wrapper };
};

describe('useConversation polling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseConversationId.mockReturnValue(conversationId);
    mockUseStreamingContext.mockReturnValue({
      activeStreams: new Map(),
      byConversationId: {},
      conversationStreamService: stubConversationStreamService,
      mutateSendMessage: jest.fn(),
      mutateResumeRound: jest.fn(),
      cancelStream: jest.fn(),
      cancelAllStreams: jest.fn(),
      removeError: jest.fn(),
      removeAllErrors: jest.fn(),
    });
    mockUseStreamRecord.mockReturnValue({ errorSteps: [] });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const advance = (ms: number) => act(async () => void jest.advanceTimersByTime(ms));

  it('does not poll a private conversation with no members', async () => {
    mockGet.mockResolvedValue(createFetchedConversation(privateAcl));
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    await advance(10_000);

    expect(mockGet).toHaveBeenCalledTimes(1);

    queryClient.clear();
  });

  it('does not poll when the conversation has no access control', async () => {
    mockGet.mockResolvedValue(createFetchedConversation());
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    await advance(10_000);

    expect(mockGet).toHaveBeenCalledTimes(1);

    queryClient.clear();
  });

  it('polls a private conversation that has members', async () => {
    mockGet.mockResolvedValue(createFetchedConversation(sharedAcl));
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    await advance(5_000);

    expect(mockGet).toHaveBeenCalledTimes(2);

    queryClient.clear();
  });

  it('polls a public conversation on every interval', async () => {
    mockGet.mockResolvedValue(createFetchedConversation(publicAcl));
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    await advance(5_000);

    expect(mockGet).toHaveBeenCalledTimes(2);

    await advance(5_000);

    expect(mockGet).toHaveBeenCalledTimes(3);

    queryClient.clear();
  });

  it('stops polling once the conversation is no longer shared', async () => {
    mockGet
      .mockResolvedValueOnce(createFetchedConversation(publicAcl))
      .mockResolvedValue(createFetchedConversation(privateAcl));
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    await advance(5_000);

    expect(mockGet).toHaveBeenCalledTimes(2);

    await advance(10_000);

    expect(mockGet).toHaveBeenCalledTimes(2);

    queryClient.clear();
  });

  const setStreaming = () => {
    mockUseStreamingContext.mockReturnValue({
      activeStreams: new Map([[conversationId, { type: 'send' }]]),
      byConversationId: {},
      conversationStreamService: stubConversationStreamService,
      mutateSendMessage: jest.fn(),
      mutateResumeRound: jest.fn(),
      cancelStream: jest.fn(),
      cancelAllStreams: jest.fn(),
      removeError: jest.fn(),
      removeAllErrors: jest.fn(),
    });
  };

  it('does not fetch a streaming conversation that has never been fetched', async () => {
    setStreaming();
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await advance(10_000);

    expect(mockGet).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('keeps fetching a streaming conversation once it is in the cache', async () => {
    setStreaming();
    mockGet.mockResolvedValue(createFetchedConversation(publicAcl));
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(
      queryKeys.conversations.byId(conversationId),
      createFetchedConversation(publicAcl)
    );

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));

    queryClient.clear();
  });

  it('does not poll while the latest event terminal is an unanswered prompt', async () => {
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(queryKeys.conversations.byId(conversationId), {
      id: conversationId,
      access_control: publicAcl,
      rounds: [{ id: 'round-1', status: ConversationRoundStatus.awaitingPrompt }],
      events: [
        createPromptRequestedTerminatedEvent({ id: 'term-1', execution_id: 'round-1::execution' }),
      ],
    } as unknown as Conversation);

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await advance(10_000);

    expect(mockGet).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('keeps the conversation reference stable when a poll returns identical data', async () => {
    mockGet.mockImplementation(async () => createFetchedConversation(publicAcl));
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.conversation).toBeDefined());
    const firstConversation = result.current.conversation;

    await advance(5_000);

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(result.current.conversation).toBe(firstConversation);

    queryClient.clear();
  });
});

describe('useConversationReadOnly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConversationId.mockReturnValue(conversationId);
    mockUseStreamRecord.mockReturnValue({ errorSteps: [] });
  });

  const setStreaming = (isStreaming: boolean) =>
    mockUseStreamingContext.mockReturnValue({
      activeStreams: isStreaming ? new Map([[conversationId, { type: 'send' }]]) : new Map(),
      byConversationId: {},
      conversationStreamService: stubConversationStreamService,
      mutateSendMessage: jest.fn(),
      mutateResumeRound: jest.fn(),
      cancelStream: jest.fn(),
      cancelAllStreams: jest.fn(),
      removeError: jest.fn(),
      removeAllErrors: jest.fn(),
    });

  it('reports loading while an opened conversation is fetched for the first time', async () => {
    setStreaming(false);
    mockGet.mockReturnValue(new Promise(() => {}));
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationReadOnly(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    queryClient.clear();
  });

  it('does not report loading while this client streams into an unfetched conversation', async () => {
    setStreaming(true);
    mockGet.mockReturnValue(new Promise(() => {}));
    const { queryClient, Wrapper } = createWrapper();
    const { result } = renderHook(() => useConversationReadOnly(), { wrapper: Wrapper });

    // The execution_started fetch runs through fetchQuery while the observer is disabled.
    queryClient
      .fetchQuery({ queryKey: queryKeys.conversations.byId(conversationId), queryFn: mockGet })
      .catch(() => {});

    await waitFor(() => expect(queryClient.isFetching()).toBe(1));
    expect(result.current.isLoading).toBe(false);
    queryClient.clear();
  });
});
