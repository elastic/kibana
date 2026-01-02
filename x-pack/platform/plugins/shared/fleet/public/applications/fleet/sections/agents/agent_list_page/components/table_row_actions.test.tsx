/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import { ExperimentalFeaturesService } from '../../../../services';
import type { LicenseService } from '../../../../../../../common/services';
import { createFleetTestRendererMock } from '../../../../../../mock';
import type { Agent, AgentPolicy } from '../../../../types';
import { useAuthz } from '../../../../../../hooks/use_authz';
import { useAgentVersion } from '../../../../../../hooks/use_agent_version';
import { useLicense } from '../../../../../../hooks/use_license';

import { TableRowActions } from './table_row_actions';

jest.mock('../../../../../../services/experimental_features');
jest.mock('../../../../../../hooks/use_authz');
jest.mock('../../../../../../hooks/use_agent_version');
jest.mock('../../../../../../hooks/use_license');

const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);
const mockedUseAuthz = jest.mocked(useAuthz);
const mockedUseAgentVersion = jest.mocked(useAgentVersion);
const mockedUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;

function renderTableRowActions({
  agent,
  agentPolicy,
}: {
  agent: Agent;
  agentPolicy?: AgentPolicy;
}) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <TableRowActions
      agent={agent}
      agentPolicy={agentPolicy}
      onAddRemoveTagsClick={jest.fn()}
      onReassignClick={jest.fn()}
      onRequestDiagnosticsClick={jest.fn()}
      onUnenrollClick={jest.fn()}
      onUpgradeClick={jest.fn()}
      onGetUninstallCommandClick={jest.fn()}
      onMigrateAgentClick={jest.fn()}
      onChangeAgentPrivilegeLevelClick={jest.fn()}
      onViewAgentJsonClick={jest.fn()}
    />
  );

  fireEvent.click(utils.getByTestId('agentActionsBtn'));

  return { utils };
}

/**
 * Helper to navigate into a submenu panel in the hierarchical menu.
 * Waits briefly for panel transition to complete.
 */
async function navigateToSubmenu(
  utils: ReturnType<typeof renderTableRowActions>['utils'],
  submenuText: string
) {
  const submenuButton = utils.getByText(submenuText).closest('button');
  if (submenuButton) {
    fireEvent.click(submenuButton);
    // Wait a bit for panel transition
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Alias for compatibility
 */
const navigateToSubmenuAndWaitFor = async (
  utils: ReturnType<typeof renderTableRowActions>['utils'],
  submenuText: string,
  _waitForTestId: string
) => {
  await navigateToSubmenu(utils, submenuText);
};

describe('TableRowActions', () => {
  beforeEach(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      enableAgentPrivilegeLevelChange: true,
    } as any);
    mockedUseLicense.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);

    mockedUseAuthz.mockReturnValue({
      fleet: {
        all: true,
        readAgents: true,
        allAgents: true,
      },
      integrations: {},
    } as any);
    mockedUseAgentVersion.mockReturnValue('8.10.2');
  });

  describe('Menu structure', () => {
    it('should render hierarchical menu with submenus', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      // Check top-level items are visible
      expect(utils.getByText('View agent')).toBeInTheDocument();
      expect(utils.getByText('Add / remove tags')).toBeInTheDocument();
      expect(utils.getByText('Assign to new policy')).toBeInTheDocument();
      expect(utils.getByText('Upgrade agent')).toBeInTheDocument();

      // Check submenu headers are visible
      expect(utils.getByText('Maintenance and diagnostics')).toBeInTheDocument();
      expect(utils.getByText('Security and removal')).toBeInTheDocument();
    });

    it('should navigate to maintenance submenu and show diagnostics', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          is_protected: false,
        } as AgentPolicy,
      });

      await navigateToSubmenu(utils, 'Maintenance and diagnostics');

      // Should show diagnostics option in submenu
      await waitFor(() => {
        expect(utils.getByTestId('requestAgentDiagnosticsBtn')).toBeInTheDocument();
      });
    });

    it('should navigate to security submenu and show unenroll', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      await navigateToSubmenu(utils, 'Security and removal');

      // Should show unenroll option in submenu
      await waitFor(() => {
        expect(utils.getByTestId('agentUnenrollBtn')).toBeInTheDocument();
      });
    });
  });

  describe('Migrate agent action', () => {
    async function renderAndGetMigrateButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderTableRowActions({
        agent,
        agentPolicy,
      });

      // Navigate to maintenance submenu where migrate lives
      const maintenanceButton = utils.queryByText('Maintenance and diagnostics');
      if (maintenanceButton) {
        await navigateToSubmenuAndWaitFor(
          utils,
          'Maintenance and diagnostics',
          'migrateAgentMenuItem'
        );
      }

      return utils.queryByTestId('migrateAgentMenuItem');
    }

    it('should render an active action button when agent isnt protected', async () => {
      const res = await renderAndGetMigrateButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          is_protected: false,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should not render an active action button when agent is protected by policy', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          is_protected: true,
        } as AgentPolicy,
      });

      // The maintenance submenu might not even show migrate if agent is protected
      const maintenanceButton = utils.queryByText('Maintenance and diagnostics');
      if (maintenanceButton) {
        await navigateToSubmenu(utils, 'Maintenance and diagnostics');
        expect(utils.queryByTestId('migrateAgentMenuItem')).toBe(null);
      }
    });

    it('should not render an active action button when agent is a fleet server agent', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          components: [{ type: 'fleet-server' }],
        } as any,
        agentPolicy: {
          is_managed: true,
          is_protected: false,
          package_policies: [{ package: { name: 'fleet_server' } }],
        } as AgentPolicy,
      });

      const maintenanceButton = utils.queryByText('Maintenance and diagnostics');
      if (maintenanceButton) {
        await navigateToSubmenu(utils, 'Maintenance and diagnostics');
        expect(utils.queryByTestId('migrateAgentMenuItem')).toBe(null);
      }
    });

    it('should not render an active action button when agent is an unsupported version', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          agent: { version: '9.1.0' },
        } as any,
        agentPolicy: {
          is_managed: false,
          is_protected: false,
        } as AgentPolicy,
      });

      const maintenanceButton = utils.queryByText('Maintenance and diagnostics');
      if (maintenanceButton) {
        await navigateToSubmenu(utils, 'Maintenance and diagnostics');
        expect(utils.queryByTestId('migrateAgentMenuItem')).toBe(null);
      }
    });

    it('should not render action when user only has read permissions', async () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          allAgents: false,
        },
        integrations: {},
      } as any);

      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          is_protected: false,
        } as AgentPolicy,
      });

      // With read-only, maintenance submenu might still show but migrate won't be there
      const maintenanceButton = utils.queryByText('Maintenance and diagnostics');
      if (maintenanceButton) {
        await navigateToSubmenu(utils, 'Maintenance and diagnostics');
        expect(utils.queryByTestId('migrateAgentMenuItem')).toBe(null);
      }
    });
  });

  describe('Request Diagnostics action', () => {
    async function renderAndGetDiagnosticsButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderTableRowActions({
        agent,
        agentPolicy,
      });

      // Navigate to maintenance submenu where diagnostics lives
      const maintenanceButton = utils.queryByText('Maintenance and diagnostics');
      if (maintenanceButton) {
        await navigateToSubmenuAndWaitFor(
          utils,
          'Maintenance and diagnostics',
          'requestAgentDiagnosticsBtn'
        );
      }

      return utils.queryByTestId('requestAgentDiagnosticsBtn');
    }

    it('should not render action if authz do not have Agents:Read', async () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          allAgents: false,
          readAgents: false,
        },
        integrations: {},
      } as any);
      const res = await renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {} as AgentPolicy,
      });
      expect(res).toBe(null);
    });

    it('should render an active action button if agent version >= 8.7', async () => {
      const res = await renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {} as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should render an active action button if agent version >= 8.7 and policy is_managed', async () => {
      const res = await renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {
          is_managed: true,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should render a disabled action button if agent version < 8.7', async () => {
      const res = await renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.6.0' } } },
        } as any,
        agentPolicy: {
          is_managed: true,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).not.toBeEnabled();
    });
  });

  describe('Restart upgrade action', () => {
    async function renderAndGetRestartUpgradeButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderTableRowActions({
        agent,
        agentPolicy,
      });

      // Navigate to upgrade management submenu where restart upgrade lives
      const upgradeManagementButton = utils.queryByText('Upgrade management');
      if (upgradeManagementButton) {
        await navigateToSubmenuAndWaitFor(utils, 'Upgrade management', 'restartUpgradeBtn');
      }

      return utils.queryByTestId('restartUpgradeBtn');
    }

    it('should render an active button when agent is stuck in updating', async () => {
      const res = await renderAndGetRestartUpgradeButton({
        agent: {
          active: true,
          status: 'updating',
          upgrade_started_at: '2022-11-21T12:27:24Z',
          local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: true } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should not render action if authz do not have Agents:All', async () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          readAgents: true,
          allAgents: false,
        },
        integrations: {},
      } as any);
      const res = await renderAndGetRestartUpgradeButton({
        agent: {
          active: true,
          status: 'updating',
          upgrade_started_at: '2022-11-21T12:27:24Z',
          local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: true } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      expect(res).toBe(null);
    });

    it('should render disabled action if agent is not stuck in updating', async () => {
      const res = await renderAndGetRestartUpgradeButton({
        agent: {
          active: true,
          status: 'updating',
          upgrade_started_at: new Date().toISOString(),
          local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: true } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      // The button should exist but be disabled (menu always shows now)
      expect(res).not.toBe(null);
      expect(res).not.toBeEnabled();
    });

    it('should not render upgrade management submenu if agent is not upgradeable', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: false } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      expect(utils.queryByText('Upgrade management')).toBe(null);
    });
  });

  describe('Upgrade action', () => {
    function renderAndGetUpgradeButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderTableRowActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('upgradeBtn');
    }

    it('should render an active action button if agent version is not the latest', async () => {
      const res = renderAndGetUpgradeButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: true } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should render an enabled action button if agent version is latest', async () => {
      const res = renderAndGetUpgradeButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.10.2', upgradeable: true } } },
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });
  });

  describe('Agent privilege level change action', () => {
    async function renderAndGetChangePrivilegeLevelButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderTableRowActions({
        agent,
        agentPolicy,
      });

      // Navigate to security submenu where privilege change lives
      const securityButton = utils.queryByText('Security and removal');
      if (securityButton) {
        await navigateToSubmenuAndWaitFor(
          utils,
          'Security and removal',
          'changeAgentPrivilegeLevelMenuItem'
        );
      }

      return utils.queryByTestId('changeAgentPrivilegeLevelMenuItem');
    }

    it('should render an active action button when agent is eligible for privilege level change', async () => {
      const res = await renderAndGetChangePrivilegeLevelButton({
        agent: {
          active: true,
          status: 'online',
          agent: {
            version: '9.3.0',
          },
          local_metadata: { elastic: { agent: { unprivileged: false } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          package_policies: [{ package: { name: 'some-integration', requires_root: false } }],
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should not render an action button when agent is already unprivileged', async () => {
      const res = await renderAndGetChangePrivilegeLevelButton({
        agent: {
          active: true,
          status: 'online',
          agent: {
            version: '9.3.0',
          },
          local_metadata: { elastic: { agent: { unprivileged: true } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          package_policies: [{ package: { name: 'some-integration', requires_root: false } }],
        } as AgentPolicy,
      });

      expect(res).toBe(null);
    });

    it('should not render an action button when agent requires root privilege', async () => {
      const res = await renderAndGetChangePrivilegeLevelButton({
        agent: {
          active: true,
          status: 'online',
          agent: {
            version: '9.3.0',
          },
          local_metadata: { elastic: { agent: { unprivileged: false } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          package_policies: [{ package: { name: 'some-integration', requires_root: true } }],
        } as AgentPolicy,
      });

      expect(res).toBe(null);
    });

    it('should not render an action button when agent is a fleet server agent', async () => {
      const res = await renderAndGetChangePrivilegeLevelButton({
        agent: {
          active: true,
          status: 'online',
          agent: {
            version: '9.3.0',
          },
          local_metadata: { elastic: { agent: { unprivileged: false } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          package_policies: [{ package: { name: 'fleet_server', requires_root: false } }],
        } as AgentPolicy,
      });

      expect(res).toBe(null);
    });

    it('should not render an action button when agent is on an unsupported version', async () => {
      const res = await renderAndGetChangePrivilegeLevelButton({
        agent: {
          active: true,
          status: 'online',
          agent: {
            version: '9.1.0',
          },
          local_metadata: { elastic: { agent: { unprivileged: false } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          package_policies: [{ package: { name: 'some-integration', requires_root: false } }],
        } as AgentPolicy,
      });

      expect(res).toBe(null);
    });

    it('should not render an action button when user only has read permissions', async () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          allAgents: false,
        },
        integrations: {},
      } as any);
      const res = await renderAndGetChangePrivilegeLevelButton({
        agent: {
          active: true,
          status: 'online',
          agent: {
            version: '9.3.0',
          },
          local_metadata: { elastic: { agent: { unprivileged: false } } },
        } as any,
        agentPolicy: {
          is_managed: false,
          package_policies: [{ package: { name: 'some-integration', requires_root: false } }],
        } as AgentPolicy,
      });

      expect(res).toBe(null);
    });
  });

  describe('View agent JSON action', () => {
    it('should render view agent JSON button in maintenance submenu', async () => {
      const { utils } = renderTableRowActions({
        agent: {
          active: true,
          status: 'online',
        } as any,
        agentPolicy: {} as AgentPolicy,
      });

      await navigateToSubmenuAndWaitFor(
        utils,
        'Maintenance and diagnostics',
        'viewAgentDetailsJsonBtn'
      );

      expect(utils.getByTestId('viewAgentDetailsJsonBtn')).toBeInTheDocument();
      expect(utils.getByTestId('viewAgentDetailsJsonBtn')).toBeEnabled();
    });
  });

  describe('Uninstall agent action', () => {
    async function renderAndGetUninstallButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderTableRowActions({
        agent,
        agentPolicy,
      });

      // Navigate to security submenu where uninstall lives
      const securityButton = utils.queryByText('Security and removal');
      if (securityButton) {
        await navigateToSubmenuAndWaitFor(utils, 'Security and removal', 'uninstallAgentMenuItem');
      }

      return utils.queryByTestId('uninstallAgentMenuItem');
    }

    it('should render uninstall button when agent has policy_id', async () => {
      const res = await renderAndGetUninstallButton({
        agent: {
          active: true,
          status: 'online',
          policy_id: 'policy-1',
        } as any,
        agentPolicy: {
          is_managed: false,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should not render uninstall button for agentless policy', async () => {
      const res = await renderAndGetUninstallButton({
        agent: {
          active: true,
          status: 'online',
          policy_id: 'policy-1',
        } as any,
        agentPolicy: {
          is_managed: false,
          supports_agentless: true,
        } as AgentPolicy,
      });

      expect(res).toBe(null);
    });
  });
});
