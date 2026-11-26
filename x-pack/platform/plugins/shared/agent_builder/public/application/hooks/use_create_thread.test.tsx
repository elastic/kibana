/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { queryKeys } from '../query_keys';
import { useAgentModel } from './agents/use_agent_model';
import { useConnectorSelection } from './chat/use_connector_selection';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useKibana } from './use_kibana';
import { useNavigation } from './use_navigation';
import { useCreateThread } from './use_create_thread';

jest.mock('uuid', () => ({ v4: () => 'thread-1' }));
jest.mock('../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('../context/conversation/use_conversation_id', () => ({ useConversationId: jest.fn() }));
jest.mock('./agents/use_agent_model', () => ({ useAgentModel: jest.fn() }));
jest.mock('./chat/use_connector_selection', () => ({ useConnectorSelection: jest.fn() }));
jest.mock('./use_agent_builder_service', () => ({ useAgentBuilderServices: jest.fn() }));
jest.mock('./use_conversation', () => ({ useAgentId: () => 'agent-1' }));
jest.mock('./use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('./use_navigation', () => ({ useNavigation: jest.fn() }));

const thread = { id: 'thread-1', agent_id: 'agent-1', events: [] };
const createThread = jest.fn();
const navigateToAgentBuilderUrl = jest.fn();
const setConversationId = jest.fn();

const setState = ({
  conversationId = 'parent-1',
  isEmbeddedContext = false,
  isModelSetByAgent = false,
  projectRouting,
}: {
  conversationId?: string | null;
  isEmbeddedContext?: boolean;
  isModelSetByAgent?: boolean;
  projectRouting?: string;
} = {}) => {
  jest.mocked(useConversationId).mockReturnValue(conversationId ?? undefined);
  jest.mocked(useConversationContext).mockReturnValue({
    isEmbeddedContext,
    setConversationId,
  } as never);
  jest.mocked(useAgentBuilderServices).mockReturnValue({
    conversationsService: { createThread },
  } as never);
  jest.mocked(useKibana).mockReturnValue({
    services: { plugins: { cps: { cpsManager: { getProjectRouting: () => projectRouting } } } },
  } as never);
  jest.mocked(useConnectorSelection).mockReturnValue({
    selectedConnector: 'connector-1',
  } as never);
  jest.mocked(useAgentModel).mockReturnValue({ isLocked: isModelSetByAgent } as never);
  jest.mocked(useNavigation).mockReturnValue({ navigateToAgentBuilderUrl } as never);
};

describe('useCreateThread', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
    });
    createThread.mockResolvedValue({
      thread_id: 'thread-1',
      execution_id: 'execution-1',
      conversation: thread,
    });
  });

  it('creates a thread of the current conversation with the highlight and run settings', async () => {
    setState({ projectRouting: '_alias:_origin' });
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(() => result.current.mutateAsync({ highlightText: '  dig into this  ' }));

    expect(createThread).toHaveBeenCalledWith({
      parentId: 'parent-1',
      client_thread_id: 'thread-1',
      highlight: { text: 'dig into this' },
      connector_id: 'connector-1',
      project_routing: '_alias:_origin',
    });
  });

  it('sends no highlight for an empty thread', async () => {
    setState();
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(() => result.current.mutateAsync({ highlightText: '   ' }));

    expect(createThread).toHaveBeenCalledWith({
      parentId: 'parent-1',
      client_thread_id: 'thread-1',
      connector_id: 'connector-1',
    });
  });

  it('passes the cut event id when given', async () => {
    setState();
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(() => result.current.mutateAsync({ cutEventId: 'event-7' }));

    expect(createThread).toHaveBeenCalledWith(expect.objectContaining({ cut_event_id: 'event-7' }));
  });

  it('leaves the connector out when the agent sets its own model', async () => {
    setState({ isModelSetByAgent: true });
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(() => result.current.mutateAsync({}));

    expect(createThread).toHaveBeenCalledWith(
      expect.not.objectContaining({ connector_id: expect.anything() })
    );
  });

  it('caches the thread, refreshes the list and the parent, then navigates to the thread', async () => {
    setState();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(() => result.current.mutateAsync({ highlightText: 'dig into this' }));

    expect(queryClient.getQueryData(queryKeys.conversations.byId('thread-1'))).toEqual(thread);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.conversations.list });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.conversations.byId('parent-1'),
    });
    expect(navigateToAgentBuilderUrl).toHaveBeenCalledWith(
      '/agents/agent-1/conversations/thread-1'
    );
    expect(setConversationId).not.toHaveBeenCalled();
  });

  it('switches the embedded conversation by state instead of navigating', async () => {
    setState({ isEmbeddedContext: true });
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(() => result.current.mutateAsync({}));

    expect(setConversationId).toHaveBeenCalledWith('thread-1');
    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });

  it('rejects without a request when there is no current conversation', async () => {
    setState({ conversationId: null });
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow(
        'Cannot create a thread without a conversation id'
      );
    });

    expect(createThread).not.toHaveBeenCalled();
    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });

  it('leaves a failed request to the caller and does not navigate', async () => {
    setState();
    createThread.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCreateThread(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow('boom');
    });

    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });
});
