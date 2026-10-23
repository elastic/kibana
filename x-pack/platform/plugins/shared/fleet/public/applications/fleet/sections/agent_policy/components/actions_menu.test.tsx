/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { userEvent } from '@testing-library/user-event';

import type { AgentPolicy, PackagePolicy } from '../../../../../../common/types';
import { useCanEnableAutomaticAgentUpgrades } from '../../../../../hooks/use_can_enable_auto_upgrades';
import { useAuthz } from '../../../hooks';
import { createFleetTestRendererMock } from '../../../../../mock';

import { AgentPolicyActionMenu } from './actions_menu';

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  useAuthz: jest.fn(),
}));

jest.mock('../../../../../hooks/use_can_enable_auto_upgrades', () => ({
  useCanEnableAutomaticAgentUpgrades: jest.fn(),
}));

describe('AgentPolicyActionMenu', () => {
  const baseAgentPolicy: AgentPolicy = {
    id: 'test',
    is_managed: false,
    is_protected: false,
    name: 'test-agent-policy',
    namespace: 'default',
    package_policies: [] as PackagePolicy[],
    revision: 1,
    status: 'active',
    updated_at: new Date().toISOString(),
    updated_by: 'test',
  };
  beforeEach(() => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgentPolicies: true,
      },
      integrations: {
        writeIntegrationPolicies: true,
      },
    } as any);

    jest.mocked(useCanEnableAutomaticAgentUpgrades).mockReturnValue(true);
  });

  describe('delete action', () => {
    it('is enabled when a managed package policy is not present', async () => {
      const testRenderer = createFleetTestRendererMock();
      const agentPolicyWithStandardPackagePolicy: AgentPolicy = {
        ...baseAgentPolicy,
        package_policies: [
          {
            id: 'test-package-policy',
            is_managed: false,
            created_at: new Date().toISOString(),
            created_by: 'test',
            enabled: true,
            inputs: [],
            name: 'test-package-policy',
            namespace: 'default',
            policy_id: 'test',
            policy_ids: ['test'],
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'test',
          },
        ],
      };

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithStandardPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const deleteButton = result.getByTestId('agentPolicyActionMenuDeleteButton');
      expect(deleteButton).not.toHaveAttribute('disabled');
    });

    it('is disabled when a managed package policy is present', async () => {
      const testRenderer = createFleetTestRendererMock();
      const agentPolicyWithManagedPackagePolicy: AgentPolicy = {
        ...baseAgentPolicy,
        package_policies: [
          {
            id: 'test-package-policy',
            is_managed: true,
            created_at: new Date().toISOString(),
            created_by: 'test',
            enabled: true,
            inputs: [],
            name: 'test-package-policy',
            namespace: 'default',
            policy_id: 'test',
            policy_ids: ['test'],
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'test',
          },
        ],
      };

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithManagedPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const deleteButton = result.getByTestId('agentPolicyActionMenuDeleteButton');
      expect(deleteButton).toHaveAttribute('disabled');
    });

    it('is disabled when the package policies summary has a managed package policy', async () => {
      const testRenderer = createFleetTestRendererMock();
      const agentPolicyWithSummary: AgentPolicy = {
        ...baseAgentPolicy,
        package_policies: undefined,
        package_policies_summary: {
          count: 4301,
          has_fleet_server: false,
          has_managed: true,
          has_root_integrations: false,
          has_shared: false,
        },
      };

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithSummary} />
      );

      await userEvent.click(result.getByTestId('agentActionsBtn'));

      expect(result.getByTestId('agentPolicyActionMenuDeleteButton')).toHaveAttribute('disabled');
    });

    it('is enabled when the package policies summary has no managed package policy', async () => {
      const testRenderer = createFleetTestRendererMock();
      const agentPolicyWithSummary: AgentPolicy = {
        ...baseAgentPolicy,
        package_policies: undefined,
        package_policies_summary: {
          count: 4301,
          has_fleet_server: false,
          has_managed: false,
          has_root_integrations: false,
          has_shared: false,
        },
      };

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithSummary} />
      );

      await userEvent.click(result.getByTestId('agentActionsBtn'));

      expect(result.getByTestId('agentPolicyActionMenuDeleteButton')).not.toHaveAttribute(
        'disabled'
      );
    });

    describe('when the package policies are not available', () => {
      const agentPolicyWithoutPackagePolicies: AgentPolicy = {
        ...baseAgentPolicy,
        package_policies: undefined,
        package_policies_summary: undefined,
      };

      it('keeps the actions that do not depend on them and disables the others', async () => {
        jest.mocked(useAuthz).mockReturnValue({
          fleet: { allAgentPolicies: true, addAgents: true },
          integrations: { writeIntegrationPolicies: true },
        } as any);
        const testRenderer = createFleetTestRendererMock();

        const result = testRenderer.render(
          <AgentPolicyActionMenu agentPolicy={agentPolicyWithoutPackagePolicies} />
        );
        await userEvent.click(result.getByTestId('agentActionsBtn'));

        expect(result.getByTestId('agentPolicyActionMenuAddAgentButton')).not.toHaveAttribute(
          'disabled'
        );
        expect(result.getByTestId('agentPolicyActionMenuDeleteButton')).toHaveAttribute('disabled');
        expect(result.getByTestId('agentPolicyActionMenuCopyButton')).toHaveAttribute('disabled');
      });

      it('offers to add a Fleet Server when the policy is flagged as having one', async () => {
        const testRenderer = createFleetTestRendererMock();

        const result = testRenderer.render(
          <AgentPolicyActionMenu
            agentPolicy={{ ...agentPolicyWithoutPackagePolicies, has_fleet_server: true }}
          />
        );
        await userEvent.click(result.getByTestId('agentActionsBtn'));

        expect(result.getByText('Add Fleet Server')).toBeInTheDocument();
      });
    });

    it('does not offer to delete the policy when agent policy support agentless is true', async () => {
      const testRenderer = createFleetTestRendererMock();
      const agentlessPolicy: AgentPolicy = {
        ...baseAgentPolicy,
        supports_agentless: true,
        package_policies: [
          {
            id: 'test-package-policy',
            is_managed: false,
            created_at: new Date().toISOString(),
            created_by: 'test',
            enabled: true,
            inputs: [],
            name: 'test-package-policy',
            namespace: 'default',
            policy_id: 'test',
            policy_ids: ['test'],
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'test',
          },
        ],
      };

      const result = testRenderer.render(<AgentPolicyActionMenu agentPolicy={agentlessPolicy} />);

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      expect(result.queryByTestId('agentPolicyActionMenuDeleteButton')).not.toBeInTheDocument();
      expect(result.getByText('View policy')).toBeInTheDocument();
    });
  });

  describe('add agent', () => {
    const agentPolicyWithStandardPackagePolicy: AgentPolicy = {
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'test-package-policy',
          is_managed: false,
          created_at: new Date().toISOString(),
          created_by: 'test',
          enabled: true,
          inputs: [],
          name: 'test-package-policy',
          namespace: 'default',
          policy_id: 'test',
          policy_ids: ['test'],
          revision: 1,
          updated_at: new Date().toISOString(),
          updated_by: 'test',
        },
      ],
    };
    it('is enabled if user is authorized', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          addAgents: true,
        },
        integrations: {
          writeIntegrationPolicies: true,
        },
      } as any);

      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithStandardPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const addButton = result.getByTestId('agentPolicyActionMenuAddAgentButton');
      expect(addButton).not.toHaveAttribute('disabled');
    });
    it('is disabled if user is not authorized', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          addAgents: false,
        },
        integrations: {
          writeIntegrationPolicies: true,
        },
      } as any);

      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithStandardPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const addButton = result.getByTestId('agentPolicyActionMenuAddAgentButton');
      expect(addButton).toHaveAttribute('disabled');
    });

    it('should remove add agent button when agent policy support agentless  is true', async () => {
      const testRenderer = createFleetTestRendererMock();
      const agentlessPolicy: AgentPolicy = {
        ...baseAgentPolicy,
        supports_agentless: true,
        package_policies: [
          {
            id: 'test-package-policy',
            is_managed: false,
            created_at: new Date().toISOString(),
            created_by: 'test',
            enabled: true,
            inputs: [],
            name: 'test-package-policy',
            namespace: 'default',
            policy_id: 'test',
            policy_ids: ['test'],
            revision: 1,
            updated_at: new Date().toISOString(),
            updated_by: 'test',
          },
        ],
      };

      const result = testRenderer.render(<AgentPolicyActionMenu agentPolicy={agentlessPolicy} />);

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const addAgentActionButton = result.queryByTestId('agentPolicyActionMenuAddAgentButton');
      expect(addAgentActionButton).toBeNull();
    });
  });

  describe('add fleet server', () => {
    const fleetServerPolicy: AgentPolicy = {
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'test-package-policy',
          package: {
            title: 'test',
            name: 'fleet_server',
            version: '1.0.0',
          },
          is_managed: false,
          created_at: new Date().toISOString(),
          created_by: 'test',
          enabled: true,
          inputs: [],
          name: 'test-package-policy',
          namespace: 'default',
          policy_id: 'test',
          policy_ids: ['test'],
          revision: 1,
          updated_at: new Date().toISOString(),
          updated_by: 'test',
        },
      ],
    };
    it('is enabled if user is authorized', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          addAgents: true,
          addFleetServers: true,
        },
        integrations: {
          writeIntegrationPolicies: true,
        },
      } as any);

      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(<AgentPolicyActionMenu agentPolicy={fleetServerPolicy} />);

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const addButton = result.getByTestId('agentPolicyActionMenuAddAgentButton');
      expect(addButton).not.toHaveAttribute('disabled');
    });

    it('is disabled if user is only authorized to add agents', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          addAgents: true,
          addFleetServers: false,
        },
        integrations: {
          writeIntegrationPolicies: true,
        },
      } as any);

      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(<AgentPolicyActionMenu agentPolicy={fleetServerPolicy} />);

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const addButton = result.getByTestId('agentPolicyActionMenuAddAgentButton');
      expect(addButton).toHaveAttribute('disabled');
    });
    it('is disabled if user is not authorized', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          addAgents: false,
        },
        integrations: {
          writeIntegrationPolicies: true,
        },
      } as any);

      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(<AgentPolicyActionMenu agentPolicy={fleetServerPolicy} />);

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const addButton = result.getByTestId('agentPolicyActionMenuAddAgentButton');
      expect(addButton).toHaveAttribute('disabled');
    });
  });

  describe('uninstall command flyout', () => {
    const agentPolicyWithAgents: AgentPolicy = {
      ...baseAgentPolicy,
      agents: 1,
    };

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
    });

    it('should not render "Uninstall agents on this policy" menu item for managed Agent', async () => {
      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={{ ...agentPolicyWithAgents, is_managed: true }} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      expect(result.queryByTestId('uninstall-agents-command-menu-item')).not.toBeInTheDocument();
    });

    it('should render "Uninstall agents on this policy" menu item for not managed Agent', async () => {
      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithAgents} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      expect(result.queryByTestId('uninstall-agents-command-menu-item')).toBeInTheDocument();
    });

    it('should open uninstall commands flyout when clicking on "Uninstall agents on this policy"', async () => {
      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithAgents} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);
      expect(result.queryByTestId('uninstall-command-flyout')).not.toBeInTheDocument();

      await userEvent.click(result.getByTestId('uninstall-agents-command-menu-item'));

      expect(result.queryByTestId('uninstall-command-flyout')).toBeInTheDocument();
    });
  });

  describe('manage auto-upgrade agents', () => {
    const agentPolicyWithStandardPackagePolicy: AgentPolicy = {
      ...baseAgentPolicy,
      package_policies: [
        {
          id: 'test-package-policy',
          is_managed: false,
          created_at: new Date().toISOString(),
          created_by: 'test',
          enabled: true,
          inputs: [],
          name: 'test-package-policy',
          namespace: 'default',
          policy_id: 'test',
          policy_ids: ['test'],
          revision: 1,
          updated_at: new Date().toISOString(),
          updated_by: 'test',
        },
      ],
    };
    it('is enabled if user is authorized', async () => {
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          allAgentPolicies: true,
          allAgents: true,
        },
        integrations: {
          writeIntegrationPolicies: true,
        },
      } as any);

      const testRenderer = createFleetTestRendererMock();

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithStandardPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const manageAutoUpgradesButton = result.getByTestId(
        'agentPolicyActionMenuManageAutoUpgradeAgentsButton'
      );
      expect(manageAutoUpgradesButton).not.toHaveAttribute('disabled');
    });
    it('is disabled if user is not authorized', async () => {
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

      const result = testRenderer.render(
        <AgentPolicyActionMenu agentPolicy={agentPolicyWithStandardPackagePolicy} />
      );

      const agentActionsButton = result.getByTestId('agentActionsBtn');
      await userEvent.click(agentActionsButton);

      const manageAutoUpgradesButton = result.getByTestId(
        'agentPolicyActionMenuManageAutoUpgradeAgentsButton'
      );
      expect(manageAutoUpgradesButton).toHaveAttribute('disabled');
    });
  });
});
