/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import type { CloudOnboardingDeploymentListItem } from '../../../../../../../../common/types';
import { sendRequestForRq, useAgentsForPolicyIds } from '../../../../../../../hooks';

import { useInstancesAgents } from './use_instances_agents';

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  sendRequestForRq: jest.fn(),
  useAgentsForPolicyIds: jest.fn(),
}));

const mockSendRequest = sendRequestForRq as jest.Mock;
const mockUseAgents = useAgentsForPolicyIds as jest.Mock;

const instance = (
  id: string,
  overrides: Partial<CloudOnboardingDeploymentListItem> = {}
): CloudOnboardingDeploymentListItem =>
  ({ id, mechanisms: ['managed_integration'], services: [], ...overrides } as any);

describe('useInstancesAgents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSendRequest.mockResolvedValue({
      items: [
        { id: 'pp-aws', policy_ids: ['agentless-1'] },
        { id: 'pp-bedrock', policy_ids: ['agentless-2'] },
        { id: 'pp-agent', policy_ids: ['user-policy'] },
      ],
    });
    mockUseAgents.mockReturnValue({ agents: [], isLoading: false, error: null });
  });

  const renderUseInstancesAgents = (
    instances: CloudOnboardingDeploymentListItem[],
    enabled = true
  ) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderHook(() => useInstancesAgents(instances, { enabled }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
  };

  it('queries the agents of the agentless and the stored agent policies', async () => {
    renderUseInstancesAgents([
      instance('mi', { packagePolicyIds: ['pp-aws', 'pp-bedrock'] }),
      instance('agent', {
        mechanisms: ['agent_based'],
        packagePolicyIds: ['pp-agent'],
        agentPolicyIds: ['user-policy'],
      }),
    ]);

    await waitFor(() =>
      expect(mockUseAgents).toHaveBeenLastCalledWith(
        ['agentless-1', 'agentless-2', 'user-policy'],
        expect.objectContaining({ enabled: true })
      )
    );
  });

  it('groups agents by instance with the package policy they run, ignoring version suffixes', async () => {
    mockUseAgents.mockReturnValue({
      agents: [
        { id: 'a1', policy_id: 'agentless-2#9.3' },
        { id: 'a2', policy_id: 'user-policy' },
        { id: 'a3', policy_id: 'unrelated' },
      ],
      isLoading: false,
      error: null,
    });

    const { result } = renderUseInstancesAgents([
      instance('mi', { packagePolicyIds: ['pp-aws', 'pp-bedrock'] }),
      instance('agent', {
        mechanisms: ['agent_based'],
        packagePolicyIds: ['pp-agent'],
        agentPolicyIds: ['user-policy'],
      }),
    ]);

    await waitFor(() => expect(result.current.agentsByInstance.get('mi')).toHaveLength(1));
    const [miAgent] = result.current.agentsByInstance.get('mi')!;
    expect(miAgent.agent.id).toBe('a1');
    expect(miAgent.agentPolicyId).toBe('agentless-2');
    expect(miAgent.packagePolicy?.id).toBe('pp-bedrock');

    expect(result.current.agentPolicyIdsByInstance.get('mi')).toEqual([
      'agentless-1',
      'agentless-2',
    ]);
    expect(result.current.agentPolicyIdsByInstance.get('agent')).toEqual(['user-policy']);

    const [agentBasedAgent] = result.current.agentsByInstance.get('agent')!;
    expect(agentBasedAgent.agent.id).toBe('a2');
    expect(agentBasedAgent.packagePolicy?.id).toBe('pp-agent');
  });

  it('reports a failed package policies request, which leaves managed instances without agents', async () => {
    const error = new Error('bulk get failed');
    mockSendRequest.mockRejectedValue(error);

    const { result } = renderUseInstancesAgents([instance('mi', { packagePolicyIds: ['pp-aws'] })]);

    await waitFor(() => expect(result.current.error).toBe(error));
  });

  it('reports a failed agents request', async () => {
    const error = new Error('agents failed');
    mockUseAgents.mockReturnValue({ agents: [], isTruncated: false, isLoading: false, error });

    const { result } = renderUseInstancesAgents([instance('mi', { packagePolicyIds: ['pp-aws'] })]);

    await waitFor(() => expect(result.current.error).toBe(error));
  });

  it('passes on that not every agent was fetched', () => {
    mockUseAgents.mockReturnValue({ agents: [], isTruncated: true, isLoading: false, error: null });

    const { result } = renderUseInstancesAgents([instance('mi')]);

    expect(result.current.isTruncated).toBe(true);
  });

  it('does not query anything when disabled', () => {
    renderUseInstancesAgents([instance('mi', { packagePolicyIds: ['pp-aws'] })], false);

    expect(mockSendRequest).not.toHaveBeenCalled();
    expect(mockUseAgents).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });
});
