/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

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
import { useConversation, useConversationReadOnly } from './use_conversation';

vi.mock('../context/conversation/use_conversation_id', () => {
  const mocked = {
    useConversationId: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../context/streaming/streaming_context', () => {
  const mocked = {
    useStreamingContext: vi.fn(),
    useStreamRecord: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const mockGet = vi.fn();

vi.mock('./use_agent_builder_service', () => {
  const mocked = {
    useAgentBuilderServices: () => ({ conversationsService: { get: mockGet } }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../context/conversation/conversation_context', () => {
  const mocked = {
    useConversationContext: () => ({}),
  };
  return { ...mocked, default: mocked };
});

vi.mock('./use_last_agent_id', () => {
  const mocked = {
    useLastAgentId: () => ({ agentId: undefined }),
  };
  return { ...mocked, default: mocked };
});

const stubConversationStreamService = new ConversationStreamService({
  getChatEvents$: () => NEVER,
  getStreamEnded$: () => NEVER,
});

const mockUseConversationId = vi.mocked(useConversationId);
const mockUseStreamingContext = vi.mocked(useStreamingContext);
const mockUseStreamRecord = vi.mocked(useStreamRecord);

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
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockUseConversationId.mockReturnValue(conversationId);
    mockUseStreamingContext.mockReturnValue({
      activeStreams: new Map(),
      byConversationId: {},
      conversationStreamService: stubConversationStreamService,
      mutateSendMessage: vi.fn(),
      mutateResumeRound: vi.fn(),
      cancelStream: vi.fn(),
      cancelAllStreams: vi.fn(),
    });
    mockUseStreamRecord.mockReturnValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advance = (ms: number) => act(async () => void vi.advanceTimersByTime(ms));

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
      mutateSendMessage: vi.fn(),
      mutateResumeRound: vi.fn(),
      cancelStream: vi.fn(),
      cancelAllStreams: vi.fn(),
    });
  };

  it('does not fetch a conversation while this client streams into it', async () => {
    setStreaming();
    mockGet.mockResolvedValue(createFetchedConversation(publicAcl));
    const { queryClient, Wrapper } = createWrapper();

    renderHook(() => useConversation(), { wrapper: Wrapper });
    await advance(10_000);

    expect(mockGet).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('renders the cached copy of a streaming conversation without refetching or polling it', async () => {
    setStreaming();
    mockGet.mockResolvedValue(createFetchedConversation(publicAcl));
    const { queryClient, Wrapper } = createWrapper();
    const cached = createFetchedConversation(publicAcl);
    queryClient.setQueryData(queryKeys.conversations.byId(conversationId), cached);

    const { result } = renderHook(() => useConversation(), { wrapper: Wrapper });
    await advance(10_000);

    expect(result.current.conversation).toBe(cached);
    expect(mockGet).not.toHaveBeenCalled();

    queryClient.clear();
  });

  it('fetches while the last round is awaiting a prompt', async () => {
    mockGet.mockResolvedValue(createFetchedConversation(publicAcl));
    const { queryClient, Wrapper } = createWrapper();
    queryClient.setQueryData(queryKeys.conversations.byId(conversationId), {
      id: conversationId,
      access_control: publicAcl,
      rounds: [{ id: 'round-1', status: ConversationRoundStatus.awaitingPrompt }],
    } as Conversation);

    renderHook(() => useConversation(), { wrapper: Wrapper });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());

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
    vi.clearAllMocks();
    mockUseConversationId.mockReturnValue(conversationId);
    mockUseStreamRecord.mockReturnValue({});
  });

  const setStreaming = (isStreaming: boolean) =>
    mockUseStreamingContext.mockReturnValue({
      activeStreams: isStreaming ? new Map([[conversationId, { type: 'send' }]]) : new Map(),
      byConversationId: {},
      conversationStreamService: stubConversationStreamService,
      mutateSendMessage: vi.fn(),
      mutateResumeRound: vi.fn(),
      cancelStream: vi.fn(),
      cancelAllStreams: vi.fn(),
    });

  it('reports loading while an opened conversation is fetched for the first time', async () => {
    setStreaming(false);
    mockGet.mockReturnValue(new Promise(() => {}));
    const { queryClient, Wrapper } = createWrapper();

    const { result } = renderHook(() => useConversationReadOnly(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(true));
    queryClient.clear();
  });
});
