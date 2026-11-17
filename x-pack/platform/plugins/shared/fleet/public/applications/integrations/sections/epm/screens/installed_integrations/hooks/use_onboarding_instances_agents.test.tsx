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

import { useOnboardingInstancesAgents } from './use_onboarding_instances_agents';

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  sendRequestForRq: jest.fn(),
  useAgentsForPolicyIds: jest.fn(),
}));

const mockSendRequest = sendRequestForRq as jest.Mock;
const mockUseAgents = useAgentsForPolicyIds as jest.Mock;

const onboardingInstance = (
  id: string,
  overrides: Partial<CloudOnboardingDeploymentListItem> = {}
): CloudOnboardingDeploymentListItem =>
  ({ id, mechanisms: ['managed_integration'], services: [], ...overrides } as any);

describe('useOnboardingInstancesAgents', () => {
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

  const renderUseOnboardingInstancesAgents = (
    onboardingInstances: CloudOnboardingDeploymentListItem[],
    enabled = true
  ) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderHook(() => useOnboardingInstancesAgents(onboardingInstances, { enabled }), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
  };

  it('queries the agents of the agentless and the stored agent policies', async () => {
    renderUseOnboardingInstancesAgents([
      onboardingInstance('mi', { packagePolicyIds: ['pp-aws', 'pp-bedrock'] }),
      onboardingInstance('agent', {
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

    const { result } = renderUseOnboardingInstancesAgents([
      onboardingInstance('mi', { packagePolicyIds: ['pp-aws', 'pp-bedrock'] }),
      onboardingInstance('agent', {
        mechanisms: ['agent_based'],
        packagePolicyIds: ['pp-agent'],
        agentPolicyIds: ['user-policy'],
      }),
    ]);

    await waitFor(() =>
      expect(result.current.agentsByOnboardingInstance.get('mi')).toHaveLength(1)
    );
    const [miAgent] = result.current.agentsByOnboardingInstance.get('mi')!;
    expect(miAgent.agent?.id).toBe('a1');
    expect(miAgent.agentPolicyId).toBe('agentless-2');
    expect(miAgent.packagePolicy?.id).toBe('pp-bedrock');

    expect(result.current.agentPolicyIdsByOnboardingInstance.get('mi')).toEqual([
      'agentless-1',
      'agentless-2',
    ]);
    expect(result.current.agentPolicyIdsByOnboardingInstance.get('agent')).toEqual(['user-policy']);

    const [agentBasedAgent] = result.current.agentsByOnboardingInstance.get('agent')!;
    expect(agentBasedAgent.agent?.id).toBe('a2');
    expect(agentBasedAgent.packagePolicy?.id).toBe('pp-agent');
  });

  it('reports a failed package policies request, which leaves managed instances without agents', async () => {
    const error = new Error('bulk get failed');
    mockSendRequest.mockRejectedValue(error);

    const { result } = renderUseOnboardingInstancesAgents([
      onboardingInstance('mi', { packagePolicyIds: ['pp-aws'] }),
    ]);

    await waitFor(() => expect(result.current.error).toBe(error));
  });

  it('reports a failed agents request', async () => {
    const error = new Error('agents failed');
    mockUseAgents.mockReturnValue({ agents: [], isTruncated: false, isLoading: false, error });

    const { result } = renderUseOnboardingInstancesAgents([
      onboardingInstance('mi', { packagePolicyIds: ['pp-aws'] }),
    ]);

    await waitFor(() => expect(result.current.error).toBe(error));
  });

  it('passes on that not every agent was fetched', () => {
    mockUseAgents.mockReturnValue({ agents: [], isTruncated: true, isLoading: false, error: null });

    const { result } = renderUseOnboardingInstancesAgents([onboardingInstance('mi')]);

    expect(result.current.isTruncated).toBe(true);
  });

  describe('pending managed integrations', () => {
    // The pending entries come from the package policies: wait for those to load before checking
    // that none was added.
    const waitForPolicies = (
      result: { current: ReturnType<typeof useOnboardingInstancesAgents> },
      onboardingInstanceId: string,
      agentPolicyIds: string[]
    ) =>
      waitFor(() =>
        expect(result.current.agentPolicyIdsByOnboardingInstance.get(onboardingInstanceId)).toEqual(
          agentPolicyIds
        )
      );

    beforeEach(() => {
      mockSendRequest.mockResolvedValue({
        items: [
          { id: 'pp-aws', policy_ids: ['agentless-1'], supports_agentless: true },
          { id: 'pp-bedrock', policy_ids: ['agentless-2'], supports_agentless: true },
          { id: 'pp-agent', policy_ids: ['user-policy'], supports_agentless: false },
        ],
      });
    });

    it('adds a pending entry for a managed integration policy without its agent', async () => {
      mockUseAgents.mockReturnValue({
        agents: [{ id: 'a1', policy_id: 'agentless-1' }],
        isTruncated: false,
        isLoading: false,
        error: null,
      });

      const { result } = renderUseOnboardingInstancesAgents([
        onboardingInstance('mi', { packagePolicyIds: ['pp-aws', 'pp-bedrock'] }),
      ]);

      await waitFor(() =>
        expect(result.current.agentsByOnboardingInstance.get('mi')).toHaveLength(2)
      );
      const [enrolled, pending] = result.current.agentsByOnboardingInstance.get('mi')!;
      expect(enrolled.agent?.id).toBe('a1');
      expect(pending.agent).toBeUndefined();
      expect(pending.agentPolicyId).toBe('agentless-2');
      expect(pending.packagePolicy?.id).toBe('pp-bedrock');
    });

    it('adds no pending entry for an agent-based policy without agents', async () => {
      const { result } = renderUseOnboardingInstancesAgents([
        onboardingInstance('agent', {
          mechanisms: ['agent_based'],
          packagePolicyIds: ['pp-agent'],
        }),
      ]);

      await waitForPolicies(result, 'agent', ['user-policy']);
      expect(result.current.agentsByOnboardingInstance.get('agent')).toBeUndefined();
    });

    it('adds no pending entry while the agents load, or when they were cut short', async () => {
      mockUseAgents.mockReturnValue({
        agents: [],
        isTruncated: false,
        isLoading: true,
        error: null,
      });
      const loading = renderUseOnboardingInstancesAgents([
        onboardingInstance('mi', { packagePolicyIds: ['pp-aws'] }),
      ]);
      await waitForPolicies(loading.result, 'mi', ['agentless-1']);
      expect(loading.result.current.agentsByOnboardingInstance.get('mi')).toBeUndefined();

      mockUseAgents.mockReturnValue({
        agents: [],
        isTruncated: true,
        isLoading: false,
        error: null,
      });
      const truncated = renderUseOnboardingInstancesAgents([
        onboardingInstance('mi', { packagePolicyIds: ['pp-aws'] }),
      ]);
      await waitForPolicies(truncated.result, 'mi', ['agentless-1']);
      expect(truncated.result.current.agentsByOnboardingInstance.get('mi')).toBeUndefined();
    });

    it('adds no pending entry when the agents request failed', async () => {
      mockUseAgents.mockReturnValue({
        agents: [],
        isTruncated: false,
        isLoading: false,
        error: new Error('agents failed'),
      });

      const { result } = renderUseOnboardingInstancesAgents([
        onboardingInstance('mi', { packagePolicyIds: ['pp-aws'] }),
      ]);

      await waitForPolicies(result, 'mi', ['agentless-1']);
      expect(result.current.agentsByOnboardingInstance.get('mi')).toBeUndefined();
    });
  });

  it('does not query anything when disabled', () => {
    renderUseOnboardingInstancesAgents(
      [onboardingInstance('mi', { packagePolicyIds: ['pp-aws'] })],
      false
    );

    expect(mockSendRequest).not.toHaveBeenCalled();
    expect(mockUseAgents).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ enabled: false })
    );
  });
});
