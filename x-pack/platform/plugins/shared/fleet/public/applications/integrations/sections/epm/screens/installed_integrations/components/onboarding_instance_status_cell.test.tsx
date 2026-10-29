/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, act } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { Agent, PackagePolicy } from '../../../../../../../../common/types';
import type { OnboardingInstanceAgent } from '../hooks/use_onboarding_instances_agents';

import { OnboardingInstanceStatusCell } from './onboarding_instance_status_cell';

jest.mock('../../../../../../../components', () => ({
  ...jest.requireActual('../../../../../../../components'),
  AgentStatusBadge: ({
    agent,
    onClick,
    'data-test-subj': dataTestSubj,
  }: {
    agent?: Agent;
    onClick?: () => void;
    'data-test-subj'?: string;
  }) =>
    onClick ? (
      <button data-test-subj={dataTestSubj} onClick={onClick}>
        {agent ? `${agent.id}:${agent.status}` : 'Pending'}
      </button>
    ) : (
      <span data-test-subj={dataTestSubj}>{agent ? `${agent.id}:${agent.status}` : 'Pending'}</span>
    ),
}));

const onboardingInstanceAgent = (
  id: string,
  status: Agent['status'] = 'online',
  withPackagePolicy = true
): OnboardingInstanceAgent => ({
  agent: { id, status } as Agent,
  agentPolicyId: 'ap1',
  packagePolicy: withPackagePolicy ? ({ id: 'pp1' } as PackagePolicy) : undefined,
});

describe('OnboardingInstanceStatusCell', () => {
  const render = (agents: OnboardingInstanceAgent[], onOpen = jest.fn()) =>
    createIntegrationsTestRendererMock().render(
      <OnboardingInstanceStatusCell agents={agents} onOpen={onOpen} />
    );

  it('shows a dash without agents', () => {
    render([]);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows the badge of a single agent', () => {
    render([onboardingInstanceAgent('a')]);
    expect(screen.getByTestId('instanceAgentStatus')).toHaveTextContent('a:online');
    expect(screen.queryByTestId('instanceAgentStatusMore')).not.toBeInTheDocument();
  });

  it('shows one badge, for the agent that most needs attention, and counts the others', () => {
    render([
      onboardingInstanceAgent('a', 'online'),
      onboardingInstanceAgent('b', 'offline'),
      onboardingInstanceAgent('c', 'degraded'),
    ]);

    expect(screen.getAllByTestId('instanceAgentStatus')).toHaveLength(1);
    expect(screen.getByTestId('instanceAgentStatus')).toHaveTextContent('c:degraded');
    expect(screen.getByTestId('instanceAgentStatusMore')).toHaveTextContent('+2');
  });

  it('opens the status of the shown agent', async () => {
    const onOpen = jest.fn();
    const agents = [onboardingInstanceAgent('a', 'online'), onboardingInstanceAgent('b', 'error')];
    render(agents, onOpen);

    await act(async () => {
      screen.getByTestId('instanceAgentStatus').click();
    });

    expect(onOpen).toHaveBeenCalledWith(agents[1]);
  });

  it('does not make the badge clickable when the package policy is unknown', () => {
    render([onboardingInstanceAgent('a', 'online', false)]);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('instanceAgentStatus')).toBeInTheDocument();
  });

  describe('a managed integration not deployed yet', () => {
    const pending: OnboardingInstanceAgent = {
      agentPolicyId: 'agentless-1',
      packagePolicy: { id: 'pp1', supports_agentless: true } as PackagePolicy,
    };

    it('shows Pending and opens its status', async () => {
      const onOpen = jest.fn();
      render([pending], onOpen);

      expect(screen.getByTestId('instanceAgentStatus')).toHaveTextContent('Pending');
      await act(async () => {
        screen.getByTestId('instanceAgentStatus').click();
      });
      expect(onOpen).toHaveBeenCalledWith(pending);
    });

    it('ranks after unhealthy agents and before healthy ones', () => {
      const { unmount } = render([onboardingInstanceAgent('a', 'online'), pending]);
      expect(screen.getByTestId('instanceAgentStatus')).toHaveTextContent('Pending');
      unmount();

      render([pending, onboardingInstanceAgent('b', 'error')]);
      expect(screen.getByTestId('instanceAgentStatus')).toHaveTextContent('b:error');
    });
  });
});
