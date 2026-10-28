/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { AgentPolicy, PackagePolicy } from '../../../../../../../../common/types';
import { useBulkGetAgentPoliciesQuery } from '../../../../../../../hooks';

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
  AgentEnrollmentFlyout: ({
    agentPolicy,
    installedPackagePolicy,
  }: {
    agentPolicy?: AgentPolicy;
    installedPackagePolicy?: { name: string; version: string };
  }) => (
    <div data-test-subj="agentEnrollmentFlyout">
      {agentPolicy?.id} {installedPackagePolicy?.name}@{installedPackagePolicy?.version}
    </div>
  ),
}));

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  useBulkGetAgentPoliciesQuery: jest.fn(),
}));

const mockUseBulkGetAgentPolicies = useBulkGetAgentPoliciesQuery as jest.Mock;

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
        agentPolicyId="ap1"
        packagePolicy={packagePolicy(supportsAgentless)}
        onClose={jest.fn()}
      />
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBulkGetAgentPolicies.mockReturnValue({
      data: { items: [{ id: 'ap1', name: 'Agent policy 1' }] },
      isLoading: false,
    });
  });

  it('opens the agentless flyout for a managed integration policy', () => {
    render(true);

    expect(screen.getByTestId('agentlessEnrollmentFlyout')).toHaveTextContent('ap1 aws-1');
    expect(screen.queryByTestId('agentEnrollmentFlyout')).not.toBeInTheDocument();
    expect(mockUseBulkGetAgentPolicies).not.toHaveBeenCalled();
  });

  it('opens the agent enrollment flyout with the agent policy for an agent-based policy', () => {
    render(false);

    expect(mockUseBulkGetAgentPolicies).toHaveBeenCalledWith(['ap1'], { ignoreMissing: true });
    expect(screen.getByTestId('agentEnrollmentFlyout')).toHaveTextContent('ap1 aws@8.11.0');
    expect(screen.queryByTestId('agentlessEnrollmentFlyout')).not.toBeInTheDocument();
  });

  it('waits for the agent policy before opening the agent enrollment flyout', () => {
    mockUseBulkGetAgentPolicies.mockReturnValue({ data: undefined, isLoading: true });
    render(false);

    expect(screen.queryByTestId('agentEnrollmentFlyout')).not.toBeInTheDocument();
  });
});
