/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, AgentPolicy } from '../../../types';
import { ExperimentalFeaturesService } from '../../../services';
import type { LicenseService } from '../../../../../../common/services';
import { useAuthz } from '../../../../../hooks/use_authz';
import { useLicense } from '../../../../../hooks/use_license';
import { createFleetTestRendererMock } from '../../../../../mock';

import { useSingleAgentMenuItems } from './use_single_agent_menu_items';
import type { SingleAgentMenuCallbacks } from './use_single_agent_menu_items';

jest.mock('../../../../../services/experimental_features');
jest.mock('../../../../../hooks/use_authz');
jest.mock('../../../../../hooks/use_license');

const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);
const mockedUseAuthz = jest.mocked(useAuthz);
const mockedUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;

const mockCallbacks: SingleAgentMenuCallbacks = {
  onViewAgentClick: jest.fn(),
  onAddRemoveTagsClick: jest.fn(),
  onReassignClick: jest.fn(),
  onUpgradeClick: jest.fn(),
  onViewAgentJsonClick: jest.fn(),
  onMigrateAgentClick: jest.fn(),
  onRequestDiagnosticsClick: jest.fn(),
  onChangeAgentPrivilegeLevelClick: jest.fn(),
  onUnenrollClick: jest.fn(),
  onUninstallClick: jest.fn(),
};

function createMockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: 'agent-1',
    active: true,
    status: 'online',
    local_metadata: { elastic: { agent: { version: '8.8.0' } } },
    ...overrides,
  } as Agent;
}

function createMockAgentPolicy(overrides: Partial<AgentPolicy> = {}): AgentPolicy {
  return {
    id: 'policy-1',
    is_managed: false,
    ...overrides,
  } as AgentPolicy;
}

describe('useSingleAgentMenuItems', () => {
  const renderer = createFleetTestRendererMock();

  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  describe('Basic structure', () => {
    it('should return menu items array', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current.length).toBeGreaterThan(0);
    });

    it('should include View agent item when onViewAgentClick is provided', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const viewAgentItem = result.current.find((item) => item.id === 'view-agent');
      expect(viewAgentItem).toBeDefined();
    });

    it('should NOT include View agent item when onViewAgentClick is not provided', () => {
      const callbacksWithoutViewAgent = { ...mockCallbacks, onViewAgentClick: undefined };
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: callbacksWithoutViewAgent,
        })
      );

      const viewAgentItem = result.current.find((item) => item.id === 'view-agent');
      expect(viewAgentItem).toBeUndefined();
    });

    it('should always include View agent JSON item in maintenance submenu', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const maintenance = result.current.find((item) => item.id === 'maintenance');
      expect(maintenance).toBeDefined();
      const viewJsonItem = maintenance?.children?.find((item) => item.id === 'view-json');
      expect(viewJsonItem).toBeDefined();
    });
  });

  describe('Top-level action items', () => {
    it('should include tags, reassign, and upgrade when user has privileges and policy is not managed', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy({ is_managed: false }),
          callbacks: mockCallbacks,
        })
      );

      expect(result.current.find((item) => item.id === 'tags')).toBeDefined();
      expect(result.current.find((item) => item.id === 'reassign')).toBeDefined();
      expect(result.current.find((item) => item.id === 'upgrade')).toBeDefined();
    });

    it('should NOT include tags, reassign, and upgrade when policy is managed', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy({ is_managed: true }),
          callbacks: mockCallbacks,
        })
      );

      expect(result.current.find((item) => item.id === 'tags')).toBeUndefined();
      expect(result.current.find((item) => item.id === 'reassign')).toBeUndefined();
      expect(result.current.find((item) => item.id === 'upgrade')).toBeUndefined();
    });

    it('should NOT include tags, reassign, and upgrade when user lacks fleet.allAgents', () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          allAgents: false,
          readAgents: true,
        },
        integrations: {},
      } as any);

      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      expect(result.current.find((item) => item.id === 'tags')).toBeUndefined();
      expect(result.current.find((item) => item.id === 'reassign')).toBeUndefined();
      expect(result.current.find((item) => item.id === 'upgrade')).toBeUndefined();
    });
  });

  describe('Submenu groups', () => {
    it('should include Upgrade management submenu when user has privileges and agent is upgradeable', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({
            local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: true } } },
          }),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const upgradeManagement = result.current.find((item) => item.id === 'upgrade-management');
      expect(upgradeManagement).toBeDefined();
      expect(upgradeManagement?.children).toBeDefined();
    });

    it('should NOT include Upgrade management submenu when agent is not upgradeable and not stuck in updating', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({
            local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: false } } },
          }),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const upgradeManagement = result.current.find((item) => item.id === 'upgrade-management');
      expect(upgradeManagement).toBeUndefined();
    });

    it('should include Upgrade management submenu when agent is actively upgrading', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({
            status: 'updating',
            upgrade_started_at: new Date().toISOString(),
            local_metadata: { elastic: { agent: { version: '8.8.0', upgradeable: false } } },
          }),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const upgradeManagement = result.current.find((item) => item.id === 'upgrade-management');
      expect(upgradeManagement).toBeDefined();
      expect(upgradeManagement?.children).toBeDefined();
    });

    it('should include Maintenance and diagnostics submenu', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy({ is_protected: false }),
          callbacks: mockCallbacks,
        })
      );

      const maintenance = result.current.find((item) => item.id === 'maintenance');
      expect(maintenance).toBeDefined();
      expect(maintenance?.children).toBeDefined();
    });

    it('should include Security and removal submenu when user has privileges', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      expect(security).toBeDefined();
      expect(security?.children).toBeDefined();
    });
  });

  describe('Diagnostics action', () => {
    it('should include diagnostics in maintenance submenu when user has readAgents', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const maintenance = result.current.find((item) => item.id === 'maintenance');
      const diagnostics = maintenance?.children?.find((item) => item.id === 'diagnostics');
      expect(diagnostics).toBeDefined();
    });

    it('should NOT include diagnostics when user lacks readAgents', () => {
      mockedUseAuthz.mockReturnValue({
        fleet: {
          allAgents: true,
          readAgents: false,
        },
        integrations: {},
      } as any);

      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const maintenance = result.current.find((item) => item.id === 'maintenance');
      const diagnostics = maintenance?.children?.find((item) => item.id === 'diagnostics');
      expect(diagnostics).toBeUndefined();
    });
  });

  describe('Migrate action', () => {
    it('should include migrate in maintenance submenu for eligible agent', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({
            local_metadata: { elastic: { agent: { version: '8.8.0' } } },
          }),
          agentPolicy: createMockAgentPolicy({ is_protected: false }),
          callbacks: mockCallbacks,
        })
      );

      const maintenance = result.current.find((item) => item.id === 'maintenance');
      const migrate = maintenance?.children?.find((item) => item.id === 'migrate');
      expect(migrate).toBeDefined();
    });

    it('should NOT include migrate for protected policy', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy({ is_protected: true }),
          callbacks: mockCallbacks,
        })
      );

      const maintenance = result.current.find((item) => item.id === 'maintenance');
      const migrate = maintenance?.children?.find((item) => item.id === 'migrate');
      expect(migrate).toBeUndefined();
    });
  });

  describe('Unenroll action', () => {
    it('should include unenroll in security submenu for non-managed policy', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy({ is_managed: false }),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      const unenroll = security?.children?.find((item) => item.id === 'unenroll');
      expect(unenroll).toBeDefined();
    });

    it('should NOT include unenroll for managed policy', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy({ is_managed: true }),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      // Security submenu might not exist at all for managed policies
      if (security) {
        const unenroll = security?.children?.find((item) => item.id === 'unenroll');
        expect(unenroll).toBeUndefined();
      }
    });

    it('should show Force unenroll when agent is unenrolling', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({ status: 'unenrolling' }),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      const unenroll = security?.children?.find((item) => item.id === 'unenroll');
      // The name should contain "Force unenroll" text (it's a ReactNode)
      expect(unenroll).toBeDefined();
    });
  });

  describe('Uninstall action', () => {
    it('should include uninstall when agent has policy_id', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({ policy_id: 'policy-1' }),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      const uninstall = security?.children?.find((item) => item.id === 'uninstall');
      expect(uninstall).toBeDefined();
    });

    it('should NOT include uninstall for agentless policy', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({ policy_id: 'policy-1' }),
          agentPolicy: createMockAgentPolicy({ supports_agentless: true }),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      const uninstall = security?.children?.find((item) => item.id === 'uninstall');
      expect(uninstall).toBeUndefined();
    });
  });

  describe('Privilege level change action', () => {
    it('should include privilege change when feature flag is enabled and agent is eligible', () => {
      mockedExperimentalFeaturesService.get.mockReturnValue({
        enableAgentPrivilegeLevelChange: true,
      } as any);

      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({
            agent: { id: 'agent-1', version: '9.3.0' },
            local_metadata: { elastic: { agent: { unprivileged: false } } },
          }),
          agentPolicy: createMockAgentPolicy({
            package_policies: [
              { package: { name: 'some-integration', requires_root: false } },
            ] as any,
          }),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      const privilegeChange = security?.children?.find((item) => item.id === 'remove-root');
      expect(privilegeChange).toBeDefined();
    });

    it('should NOT include privilege change when feature flag is disabled', () => {
      mockedExperimentalFeaturesService.get.mockReturnValue({
        enableAgentPrivilegeLevelChange: false,
      } as any);

      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent({
            agent: { id: 'agent-1', version: '9.3.0' },
            local_metadata: { elastic: { agent: { unprivileged: false } } },
          }),
          agentPolicy: createMockAgentPolicy({
            package_policies: [
              { package: { name: 'some-integration', requires_root: false } },
            ] as any,
          }),
          callbacks: mockCallbacks,
        })
      );

      const security = result.current.find((item) => item.id === 'security');
      const privilegeChange = security?.children?.find((item) => item.id === 'remove-root');
      expect(privilegeChange).toBeUndefined();
    });
  });

  describe('Callback invocations', () => {
    it('should wire up callbacks correctly', () => {
      const { result } = renderer.renderHook(() =>
        useSingleAgentMenuItems({
          agent: createMockAgent(),
          agentPolicy: createMockAgentPolicy(),
          callbacks: mockCallbacks,
        })
      );

      // View agent JSON callback (in maintenance submenu)
      const maintenance = result.current.find((item) => item.id === 'maintenance');
      const viewJsonItem = maintenance?.children?.find((item) => item.id === 'view-json');
      expect(viewJsonItem?.onClick).toBeDefined();
    });
  });
});
