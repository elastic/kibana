/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { Agent, AgentPolicy, PackagePolicy } from '../../../../../../../../common/types';

import { InstanceAgentFlyout } from './instance_agent_flyout';

jest.mock('../../../../../../../components', () => ({
  ...jest.requireActual('../../../../../../../components'),
  AgentlessEnrollmentFlyout: ({
    policyId,
    policyName,
  }: {
    policyId: string;
    policyName: string;
  }) => (
    <div data-test-subj="agentlessEnrollmentFlyout">
      {policyId} {policyName}
    </div>
  ),
  AgentlessStatusDetailsFlyout: ({
    policyName,
    agent,
    agentPolicy,
    packagePolicy,
  }: {
    policyName: string;
    agent: Agent;
    agentPolicy?: AgentPolicy;
    packagePolicy: PackagePolicy;
  }) => (
    <div data-test-subj="agentlessStatusDetailsFlyout">
      {policyName} {agent.id} {agentPolicy?.id} {packagePolicy.id}
    </div>
  ),
}));

const packagePolicy = (supportsAgentless: boolean) =>
  ({
    id: 'pp1',
    name: 'aws-1',
    policy_ids: ['ap1'],
    supports_agentless: supportsAgentless,
    package: { name: 'aws', title: 'AWS', version: '8.11.0' },
    inputs: [],
  } as unknown as PackagePolicy);

describe('InstanceAgentFlyout', () => {
  const render = (supportsAgentless: boolean) =>
    createIntegrationsTestRendererMock().render(
      <InstanceAgentFlyout
        agent={{ id: 'agent-1', status: 'degraded' } as Agent}
        agentPolicyId="ap1"
        packagePolicy={packagePolicy(supportsAgentless)}
        onClose={jest.fn()}
      />
    );

  it('opens the agentless enrollment flyout for a managed integration policy', () => {
    render(true);

    expect(screen.getByTestId('agentlessEnrollmentFlyout')).toHaveTextContent('ap1 aws-1');
    expect(screen.queryByTestId('agentlessStatusDetailsFlyout')).not.toBeInTheDocument();
  });

  it('opens the component health of the clicked agent for an agent-based policy', () => {
    render(false);

    expect(screen.getByTestId('agentlessStatusDetailsFlyout')).toHaveTextContent(
      'AWS agent-1 ap1 pp1'
    );
    expect(screen.queryByTestId('agentlessEnrollmentFlyout')).not.toBeInTheDocument();
  });
});
