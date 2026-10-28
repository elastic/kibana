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
import type { InstanceAgent } from '../hooks/use_instances_agents';

import { InstanceStatusCell } from './instance_status_cell';

jest.mock('../../../../../../../components', () => ({
  ...jest.requireActual('../../../../../../../components'),
  AgentStatusBadge: ({
    agent,
    onClick,
    'data-test-subj': dataTestSubj,
  }: {
    agent: Agent;
    onClick?: () => void;
    'data-test-subj'?: string;
  }) =>
    onClick ? (
      <button data-test-subj={dataTestSubj} onClick={onClick}>
        {agent.id}:{agent.status}
      </button>
    ) : (
      <span data-test-subj={dataTestSubj}>
        {agent.id}:{agent.status}
      </span>
    ),
}));

const instanceAgent = (
  id: string,
  status: Agent['status'] = 'online',
  withPackagePolicy = true
): InstanceAgent => ({
  agent: { id, status } as Agent,
  agentPolicyId: 'ap1',
  packagePolicy: withPackagePolicy ? ({ id: 'pp1' } as PackagePolicy) : undefined,
});

describe('InstanceStatusCell', () => {
  const render = (agents: InstanceAgent[], onOpen = jest.fn()) =>
    createIntegrationsTestRendererMock().render(
      <InstanceStatusCell agents={agents} onOpen={onOpen} />
    );

  it('shows a dash without agents', () => {
    render([]);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('shows the badge of a single agent', () => {
    render([instanceAgent('a')]);
    expect(screen.getByTestId('instanceAgentStatus')).toHaveTextContent('a:online');
    expect(screen.queryByTestId('instanceAgentStatusMore')).not.toBeInTheDocument();
  });

  it('shows one badge, for the agent that most needs attention, and counts the others', () => {
    render([
      instanceAgent('a', 'online'),
      instanceAgent('b', 'offline'),
      instanceAgent('c', 'degraded'),
    ]);

    expect(screen.getAllByTestId('instanceAgentStatus')).toHaveLength(1);
    expect(screen.getByTestId('instanceAgentStatus')).toHaveTextContent('c:degraded');
    expect(screen.getByTestId('instanceAgentStatusMore')).toHaveTextContent('+2');
  });

  it('opens the status of the shown agent', async () => {
    const onOpen = jest.fn();
    const agents = [instanceAgent('a', 'online'), instanceAgent('b', 'error')];
    render(agents, onOpen);

    await act(async () => {
      screen.getByTestId('instanceAgentStatus').click();
    });

    expect(onOpen).toHaveBeenCalledWith(agents[1]);
  });

  it('does not make the badge clickable when the package policy is unknown', () => {
    render([instanceAgent('a', 'online', false)]);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('instanceAgentStatus')).toBeInTheDocument();
  });
});
