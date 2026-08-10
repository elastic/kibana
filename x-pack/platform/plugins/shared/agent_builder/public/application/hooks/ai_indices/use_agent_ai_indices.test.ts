/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { AgentDefinitionWithPermissions } from '../../../../common/http_api/agents';
import { queryKeys } from '../../query_keys';
import { useAgentAiIndices } from './use_agent_ai_indices';

const update = jest.fn();
const addSuccessToast = jest.fn();
const addErrorToast = jest.fn();

jest.mock('../use_agent_builder_service');
jest.mock('../use_toasts');

const { useAgentBuilderServices } = jest.requireMock('../use_agent_builder_service');
const { useToasts } = jest.requireMock('../use_toasts');

const agent = (id: string, aiIndices: string[]) =>
  ({
    id,
    name: `Agent ${id}`,
    type: 'chat',
    configuration: { tools: [], ai_indices: aiIndices },
  } as unknown as AgentDefinitionWithPermissions);

const readAiIndices = (queryClient: QueryClient, agentId: string) =>
  queryClient
    .getQueryData<AgentDefinitionWithPermissions[]>(queryKeys.agentProfiles.all)
    ?.find((a) => a.id === agentId)?.configuration.ai_indices;

describe('useAgentAiIndices', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    update.mockResolvedValue({});
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(queryKeys.agentProfiles.all, [
      agent('agent-1', []),
      agent('agent-2', ['untouched']),
    ]);
    useAgentBuilderServices.mockReturnValue({ agentService: { update } });
    useToasts.mockReturnValue({ addSuccessToast, addErrorToast });
  });

  const setup = () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    return renderHook(() => useAgentAiIndices(), { wrapper });
  };

  it('sends the new AI index list to the agent update API', async () => {
    const { result } = setup();

    act(() => {
      result.current.setAiIndices({
        agentId: 'agent-1',
        agentName: 'Agent agent-1',
        aiIndices: ['sales'],
      });
    });

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith('agent-1', {
        configuration: { ai_indices: ['sales'] },
      })
    );
  });

  it('optimistically patches only the edited agent in the list cache', async () => {
    const { result } = setup();

    act(() => {
      result.current.setAiIndices({
        agentId: 'agent-1',
        agentName: 'Agent agent-1',
        aiIndices: ['sales'],
      });
    });

    await waitFor(() => expect(readAiIndices(queryClient, 'agent-1')).toEqual(['sales']));
    expect(readAiIndices(queryClient, 'agent-2')).toEqual(['untouched']);
  });

  it('shows a success toast when the update lands', async () => {
    const { result } = setup();

    act(() => {
      result.current.setAiIndices({
        agentId: 'agent-1',
        agentName: 'My agent',
        aiIndices: ['sales'],
      });
    });

    await waitFor(() => expect(addSuccessToast).toHaveBeenCalled());
    expect(addErrorToast).not.toHaveBeenCalled();
  });

  it('rolls the cache back and shows an error toast when the update fails', async () => {
    update.mockRejectedValue(new Error('boom'));
    const { result } = setup();

    act(() => {
      result.current.setAiIndices({
        agentId: 'agent-1',
        agentName: 'Agent agent-1',
        aiIndices: ['sales'],
      });
    });

    await waitFor(() => expect(addErrorToast).toHaveBeenCalled());
    expect(readAiIndices(queryClient, 'agent-1')).toEqual([]);
    expect(addSuccessToast).not.toHaveBeenCalled();
  });

  it('invalidates both the list and the single-agent caches on settle', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = setup();

    act(() => {
      result.current.setAiIndices({
        agentId: 'agent-1',
        agentName: 'Agent agent-1',
        aiIndices: ['sales'],
      });
    });

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.agentProfiles.all })
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.agentProfiles.byId('agent-1'),
    });
  });
});
