/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useConversationContext } from '../context/conversation/conversation_context';
import { useConversationId } from '../context/conversation/use_conversation_id';
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversationStream } from './use_conversation_stream';
import { useNavigation } from './use_navigation';
import { useToasts } from './use_toasts';
import { useSubmitMessage } from './use_submit_message';

jest.mock('../context/conversation/conversation_context', () => ({
  useConversationContext: jest.fn(),
}));
jest.mock('../context/conversation/use_conversation_id', () => ({ useConversationId: jest.fn() }));
jest.mock('./use_agent_builder_service', () => ({ useAgentBuilderServices: jest.fn() }));
jest.mock('./use_conversation', () => ({ useAgentId: () => 'agent-1' }));
jest.mock('./use_conversation_stream', () => ({ useConversationStream: jest.fn() }));
jest.mock('./use_navigation', () => ({ useNavigation: jest.fn() }));
jest.mock('./use_toasts', () => ({ useToasts: jest.fn() }));
jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const created = { id: 'conv-1', agent_id: 'agent-1', events: [], rounds: [] };
const create = jest.fn();
const sendMessage = jest.fn();
const navigateToAgentBuilderUrl = jest.fn();
const setConversationId = jest.fn();
const addErrorToast = jest.fn();

const setState = ({
  conversationId,
  isEmbeddedContext = false,
}: {
  conversationId?: string;
  isEmbeddedContext?: boolean;
}) => {
  jest.mocked(useConversationId).mockReturnValue(conversationId);
  jest.mocked(useConversationContext).mockReturnValue({
    isEmbeddedContext,
    setConversationId,
  } as never);
  jest.mocked(useAgentBuilderServices).mockReturnValue({
    conversationsService: { create },
  } as never);
  jest.mocked(useConversationStream).mockReturnValue({ sendMessage } as never);
  jest.mocked(useNavigation).mockReturnValue({ navigateToAgentBuilderUrl } as never);
  jest.mocked(useToasts).mockReturnValue({ addErrorToast } as never);
};

describe('useSubmitMessage', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    create.mockResolvedValue(created);
  });

  it('creates the conversation, caches it, then sends and navigates to it', async () => {
    setState({});
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSubmitMessage(), { wrapper });

    await act(() => result.current.submitMessage('hello'));

    expect(create).toHaveBeenCalledWith({ agentId: 'agent-1' });
    expect(queryClient.getQueryData(queryKeys.conversations.byId('conv-1'))).toEqual(created);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.conversations.list });
    expect(sendMessage).toHaveBeenCalledWith({ message: 'hello', conversationId: 'conv-1' });
    expect(navigateToAgentBuilderUrl).toHaveBeenCalledWith(
      expect.stringContaining('/agents/agent-1/conversations/conv-1')
    );
  });

  it('reports that the conversation is being created while the request is in flight', async () => {
    setState({});
    let resolveCreate: (value: typeof created) => void = () => {};
    create.mockReturnValue(new Promise((resolve) => (resolveCreate = resolve)));
    const { result } = renderHook(() => useSubmitMessage(), { wrapper });

    let pending: Promise<void>;
    act(() => {
      pending = result.current.submitMessage('hello');
    });
    await waitFor(() => expect(result.current.isCreatingConversation).toBe(true));

    resolveCreate(created);
    await act(() => pending);

    await waitFor(() => expect(result.current.isCreatingConversation).toBe(false));
    expect(sendMessage).toHaveBeenCalledWith({ message: 'hello', conversationId: 'conv-1' });
  });

  it('switches the embedded conversation by state instead of navigating', async () => {
    setState({ isEmbeddedContext: true });
    const { result } = renderHook(() => useSubmitMessage(), { wrapper });

    await act(() => result.current.submitMessage('hello'));

    expect(setConversationId).toHaveBeenCalledWith('conv-1');
    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });

  it('sends straight away in an existing conversation', async () => {
    setState({ conversationId: 'existing' });
    const { result } = renderHook(() => useSubmitMessage(), { wrapper });

    await act(() => result.current.submitMessage('hello'));

    expect(create).not.toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith({ message: 'hello', conversationId: 'existing' });
    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });

  it('shows an error and sends nothing when the conversation cannot be created', async () => {
    setState({});
    create.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useSubmitMessage(), { wrapper });

    await act(() => result.current.submitMessage('hello'));

    expect(addErrorToast).toHaveBeenCalledWith({ title: 'boom' });
    expect(sendMessage).not.toHaveBeenCalled();
    expect(navigateToAgentBuilderUrl).not.toHaveBeenCalled();
  });
});
