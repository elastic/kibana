/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { AgentPolicy } from '../../../../../types';

import { NoPackagePolicies } from './no_package_policies';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useAuthz: jest.fn().mockReturnValue({
    fleet: { allAgentPolicies: true },
    integrations: { writeIntegrationPolicies: true },
  }),
}));

jest.mock('./add_integration_flyout', () => ({
  AddIntegrationFlyout: () => <div data-test-subj="addIntegrationFlyout" />,
}));

const render = (policy: Partial<AgentPolicy>) => {
  const renderer = createFleetTestRendererMock();
  return renderer.render(
    <NoPackagePolicies
      agentPolicy={{ id: 'policy1', name: 'Policy 1', ...policy } as AgentPolicy}
      refreshAgentPolicy={jest.fn()}
    />
  );
};

describe('NoPackagePolicies', () => {
  it('enables the add integration button for a regular policy', () => {
    const result = render({ is_managed: false });
    expect(result.getByTestId('addPackagePolicyButton')).toBeEnabled();
  });

  it('disables the add integration button for a managed policy', () => {
    const result = render({ is_managed: true });
    expect(result.getByTestId('addPackagePolicyButton')).toBeDisabled();
  });

  it('disables the add integration button for an agentless policy', () => {
    const result = render({ supports_agentless: true });
    expect(result.getByTestId('addPackagePolicyButton')).toBeDisabled();
  });
});
