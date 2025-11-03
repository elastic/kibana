/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { Agent, AgentPolicy } from '../../../../types';
import { ExperimentalFeaturesService } from '../../../../services';
import { useAuthz } from '../../../../../../hooks/use_authz';
import { useAgentVersion } from '../../../../../../hooks/use_agent_version';
import type { LicenseService } from '../../../../../../../common/services';
import { useLicense } from '../../../../../../hooks/use_license';

import { AgentDetailsActionMenu } from './actions_menu';

jest.mock('../../../../../../services/experimental_features');
jest.mock('../../../../../../hooks/use_authz');
jest.mock('../../../../../../hooks/use_agent_version');
jest.mock('../../../../../../hooks/use_license');

const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);
const mockedUseAuthz = jest.mocked(useAuthz);
const mockedUseAgentVersion = jest.mocked(useAgentVersion);
const mockedUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;

function renderActions({ agent, agentPolicy }: { agent: Agent; agentPolicy?: AgentPolicy }) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <AgentDetailsActionMenu
      agent={agent}
      agentPolicy={agentPolicy}
      assignFlyoutOpenByDefault={false}
      onCancelReassign={jest.fn()}
      onAddRemoveTagsClick={jest.fn()}
    />
  );

  fireEvent.click(utils.getByRole('button'));

  return { utils };
}

describe('AgentDetailsActionMenu', () => {
  beforeEach(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      enableAgentPrivilegeLevelChange: true,
    } as any);
    mockedUseLicense.mockReturnValue({
      hasAtLeast: () => true,
    } as unknown as LicenseService);
    mockedUseAuthz.mockReturnValue({
      fleet: {
        readAgents: true,
        allAgents: true,
      },
      integrations: {},
    } as any);
    mockedUseAgentVersion.mockReturnValue('8.10.2');
  });

  describe('Request Diagnotics action', () => {
    function renderAndGetDiagnosticsButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('requestAgentDiagnosticsBtn');
    }

    it('should render an active action button if agent version >= 8.7', async () => {
      const res = renderAndGetDiagnosticsButton({
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
      const res = renderAndGetDiagnosticsButton({
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
      const res = renderAndGetDiagnosticsButton({
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

    it('should not render an active action button if agent version >= 8.7 and user do not have Agent:Read authz', async () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          readAgents: false,
        },
        integrations: {},
      } as any);
      const res = renderAndGetDiagnosticsButton({
        agent: {
          active: true,
          status: 'online',
          local_metadata: { elastic: { agent: { version: '8.8.0' } } },
        } as any,
        agentPolicy: {} as AgentPolicy,
      });

      expect(res).toBe(null);
    });
  });

  describe('View agent JSON action', () => {
    function renderAndGetViewJSONButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('viewAgentDetailsJsonBtn');
    }

    it('should render an active button', async () => {
      const res = renderAndGetViewJSONButton({
        agent: {} as any,
        agentPolicy: {} as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should render an active button for managed agent policy', async () => {
      const res = renderAndGetViewJSONButton({
        agent: {} as any,
        agentPolicy: {
          is_managed: true,
        } as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });
  });

  describe('Restart upgrade action', () => {
    function renderAndGetRestartUpgradeButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('restartUpgradeBtn');
    }

    it('should render an active button', async () => {
      const res = renderAndGetRestartUpgradeButton({
        agent: {
          status: 'updating',
          upgrade_started_at: '2022-11-21T12:27:24Z',
        } as any,
        agentPolicy: {} as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });

    it('should not render action if agent is not stuck in updating', async () => {
      const res = renderAndGetRestartUpgradeButton({
        agent: {
          status: 'updating',
          upgrade_started_at: new Date().toISOString(),
        } as any,
        agentPolicy: {} as AgentPolicy,
      });
      expect(res).toBe(null);
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
      const { utils } = renderActions({
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
        agentPolicy: {} as AgentPolicy,
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
        agentPolicy: {} as AgentPolicy,
      });

      expect(res).not.toBe(null);
      expect(res).toBeEnabled();
    });
  });

  describe('Migrate agent action', () => {
    function renderAndGetMigrateButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('migrateAgentBtn');
    }

    it('should render an active action button when agent isnt protected', async () => {
      mockedUseLicense.mockReturnValue({
        hasAtLeast: () => true,
      } as unknown as LicenseService);

      const res = renderAndGetMigrateButton({
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
      const res = renderAndGetMigrateButton({
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

      expect(res).toBe(null);
    });

    it('should not render an active action button when agent is a fleet server agent', async () => {
      const res = renderAndGetMigrateButton({
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

      expect(res).toBe(null);
    });
    it('should not render an active action button when agent is an unsupported version', async () => {
      const res = renderAndGetMigrateButton({
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

      expect(res).toBe(null);
    });

    it('should not render action when user only has read permissions', async () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          allAgents: false,
        },
        integrations: {},
      } as any);

      const res = renderAndGetMigrateButton({
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

      expect(res).toBe(null);
    });
  });

  describe('Agent privilege level change action', () => {
    function renderAndGetChangePrivilegeLevelButton({
      agent,
      agentPolicy,
    }: {
      agent: Agent;
      agentPolicy?: AgentPolicy;
    }) {
      const { utils } = renderActions({
        agent,
        agentPolicy,
      });

      return utils.queryByTestId('changeAgentPrivilegeLevelBtn');
    }

    it('should render an active action button when agent is eligible for privilege level change', async () => {
      const res = renderAndGetChangePrivilegeLevelButton({
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
      const res = renderAndGetChangePrivilegeLevelButton({
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
      const res = renderAndGetChangePrivilegeLevelButton({
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
      const res = renderAndGetChangePrivilegeLevelButton({
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
      const res = renderAndGetChangePrivilegeLevelButton({
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
      const res = renderAndGetChangePrivilegeLevelButton({
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
});
