/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useAuthz } from '../../../../../hooks';
import { useCanEnableAutomaticAgentUpgrades } from '../../../../../../../hooks/use_can_enable_auto_upgrades';
import { createFleetTestRendererMock } from '../../../../../../../mock';

import { HeaderRightContent } from './right_content';

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useAuthz: jest.fn(),
}));
jest.mock('../../../../../../../hooks/use_can_enable_auto_upgrades', () => ({
  useCanEnableAutomaticAgentUpgrades: jest.fn(() => true),
}));

const agentPolicy = {
  id: 'policy-1',
  revision: 1,
  package_policies: [],
  agents: 10,
  is_managed: false,
  updated_at: new Date().toISOString(),
};

describe('HeaderRightContent', () => {
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgentPolicies: true,
        allAgents: true,
      },
      integrations: {
        writeIntegrationPolicies: true,
      },
    } as any);

    jest.mocked(useCanEnableAutomaticAgentUpgrades).mockReturnValue(true);
  });
  describe('Auto-upgrade agents action', () => {
    const labelText = 'Auto-upgrade agents';
    it('shows when user is authorized', () => {
      const testRenderer = createFleetTestRendererMock();

      const { getByText } = testRenderer.render(
        <HeaderRightContent
          isLoading={false}
          agentPolicy={agentPolicy as any}
          addAgent={jest.fn()}
          isAddAgentHelpPopoverOpen={false}
          setIsAddAgentHelpPopoverOpen={jest.fn()}
        />
      );

      const label = getByText(labelText);
      expect(label).toBeInTheDocument();
    });

    it('does not show when user is unauthorized', () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          allAgentPolicies: true,
          allAgents: false,
        },
        integrations: {
          writeIntegrationPolicies: true,
        },
      } as any);
      const testRenderer = createFleetTestRendererMock();

      const { queryByText } = testRenderer.render(
        <HeaderRightContent
          isLoading={false}
          agentPolicy={agentPolicy as any}
          addAgent={jest.fn()}
          isAddAgentHelpPopoverOpen={false}
          setIsAddAgentHelpPopoverOpen={jest.fn()}
        />
      );

      const label = queryByText(labelText);
      expect(label).not.toBeInTheDocument();
    });
  });
});
