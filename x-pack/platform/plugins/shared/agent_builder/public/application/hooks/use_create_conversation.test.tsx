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
import { queryKeys } from '../query_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useToasts } from './use_toasts';
import { useCreateConversation } from './use_create_conversation';

jest.mock('./use_agent_builder_service', () => ({ useAgentBuilderServices: jest.fn() }));
jest.mock('./use_toasts', () => ({ useToasts: jest.fn() }));
jest.mock('@kbn/agent-builder-browser', () => ({
  formatAgentBuilderErrorMessage: (error: Error) => error.message,
}));

const created = { id: 'conv-1', agent_id: 'agent-1', events: [], rounds: [] };
const create = jest.fn();
const addErrorToast = jest.fn();

describe('useCreateConversation', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient();
    jest.mocked(useAgentBuilderServices).mockReturnValue({
      conversationsService: { create },
    } as never);
    jest.mocked(useToasts).mockReturnValue({ addErrorToast } as never);
    create.mockResolvedValue(created);
  });

  it('creates the conversation and caches it', async () => {
    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    let conversation;
    await act(async () => {
      conversation = await result.current.createConversation('agent-1');
    });

    expect(create).toHaveBeenCalledWith({ agentId: 'agent-1' });
    expect(conversation).toEqual(created);
    expect(queryClient.getQueryData(queryKeys.conversations.byId('conv-1'))).toEqual(created);
  });

  it('keeps the loading state of each caller apart', async () => {
    create.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(
      () => ({ first: useCreateConversation(), second: useCreateConversation() }),
      { wrapper }
    );

    act(() => {
      result.current.first.createConversation('agent-1');
    });

    await waitFor(() => expect(result.current.first.isCreatingConversation).toBe(true));
    expect(result.current.second.isCreatingConversation).toBe(false);
  });

  it('shows an error when the conversation cannot be created', async () => {
    create.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useCreateConversation(), { wrapper });

    await act(async () => {
      await result.current.createConversation('agent-1').catch(() => {});
    });

    expect(addErrorToast).toHaveBeenCalledWith({ title: 'boom' });
  });
});
