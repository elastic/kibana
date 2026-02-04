/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, act } from '@testing-library/react';

import type { Agent } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../../../mock';
import type { LicenseService } from '../../../../services';
import { ExperimentalFeaturesService } from '../../../../services';
import { AgentReassignAgentPolicyModal } from '../../components/agent_reassign_policy_modal';
import { useAuthz } from '../../../../../../hooks/use_authz';
import { useLicense } from '../../../../../../hooks/use_license';
import { useStartServices } from '../../../../../../hooks/use_core';

import { AgentBulkActions } from './bulk_actions';

jest.mock('../../../../../../services/experimental_features');
jest.mock('../../../../../../hooks/use_license');
jest.mock('../../../../../../hooks/use_authz');
jest.mock('../../../../../../hooks/use_core');
jest.mock('../../components/agent_reassign_policy_modal');
jest.mock('../hooks/export_csv', () => ({
  useExportCSV: jest.fn().mockReturnValue({
    generateReportingJobCSV: jest.fn(),
  }),
}));

const mockedUseLicence = useLicense as jest.MockedFunction<typeof useLicense>;
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);
const mockUseStartServices = useStartServices as jest.Mock;

const defaultProps = {
  nAgentsInTable: 10,
  totalManagedAgentIds: [],
  selectionMode: 'manual',
  currentQuery: '',
  selectedAgents: [],
  agentsOnCurrentPage: [],
  refreshAgents: () => undefined,
  allTags: [],
  agentPolicies: [],
  unsupportedMigrateAgents: [],
  unsupportedPrivilegeLevelChangeAgents: [],
};

/**
 * Helper to navigate into a submenu panel in the hierarchical menu.
 * Waits briefly for panel transition to complete.
 */
async function navigateToSubmenu(
  results: { getByText: (text: string) => HTMLElement },
  submenuText: string
) {
  const submenuButton = results.getByText(submenuText).closest('button');
  if (submenuButton) {
    await act(async () => {
      fireEvent.click(submenuButton);
    });
    // Wait a bit for panel transition
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

describe('AgentBulkActions', () => {
  const mockStartServices = (isServerlessEnabled?: boolean) => {
    mockUseStartServices.mockReturnValue({
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
      docLinks: {
        links: {
          fleet: {},
          logstash: {},
          kibana: {},
          observability: {},
        },
      },
      cloud: {
        isServerlessEnabled,
      },
      reporting: {},
    });
  };

  beforeAll(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      enableAgentPrivilegeLevelChange: true,
    } as any);
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        allAgents: true,
        readAgents: true,
      },
      integrations: {},
    } as any);
    mockStartServices(true);
  });

  beforeEach(() => {
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => false,
    } as unknown as LicenseService);
    jest.mocked(AgentReassignAgentPolicyModal).mockReset();
    jest.mocked(AgentReassignAgentPolicyModal).mockReturnValue(null);
  });

  afterEach(() => {
    mockedUseLicence.mockReturnValue({
      hasAtLeast: () => false,
    } as unknown as LicenseService);
  });

  function render(props: any) {
    const renderer = createFleetTestRendererMock();
    return renderer.render(<AgentBulkActions {...props} />);
  }

  describe('When in manual selection mode', () => {
    it('should show top-level actions for the selected agents', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1', tags: ['oldTag'] }, { id: 'agent2' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      // Check top-level items
      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 2 agents').closest('button')!).toBeEnabled();

      // Check submenu triggers exist
      expect(results.getByText('Upgrade management')).toBeInTheDocument();
      expect(results.getByText('Maintenance and diagnostics')).toBeInTheDocument();
      expect(results.getByText('Security and removal')).toBeInTheDocument();
    });

    it('should show upgrade management submenu items', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1' }, { id: 'agent2' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Upgrade management');

      expect(results.getByText('Schedule upgrade for 2 agents').closest('button')!).toBeDisabled();
      expect(results.getByText('Restart upgrade for 2 agents').closest('button')!).toBeEnabled();
    });

    it('should show maintenance and diagnostics submenu items', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1' }, { id: 'agent2' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Maintenance and diagnostics');

      expect(
        results.getByText('Request diagnostics for 2 agents').closest('button')!
      ).toBeEnabled();
      expect(results.getByText('Migrate 2 agents').closest('button')!).toBeEnabled();
    });

    it('should show security and removal submenu items', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1' }, { id: 'agent2' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Security and removal');

      expect(results.getByText('Unenroll 2 agents').closest('button')!).toBeEnabled();
      expect(
        results.getByText('Remove root privilege for 2 agents').closest('button')!
      ).toBeEnabled();
    });

    it('should allow scheduled upgrades if the license allows it', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: () => true,
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1', tags: ['oldTag'] }, { id: 'agent2' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Upgrade management');

      expect(results.getByText('Schedule upgrade for 2 agents').closest('button')!).toBeEnabled();
    });
    it('should show disabled CSV action if user does not have generateAgentReports permission', async () => {
      mockStartServices(false);
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          allAgents: true,
          readAgents: true,
          generateAgentReports: false,
        },
        integrations: {},
      } as any);

      const results = render({
        ...defaultProps,
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Maintenance and diagnostics');

      const exportToCSVButton = results.queryByTestId('bulkAgentExportBtn');
      expect(exportToCSVButton).toBeInTheDocument();
      expect(exportToCSVButton).toBeDisabled();
    });

    it('should show enabled CSV action if user has generateAgentReports permission', async () => {
      mockStartServices(true);
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          allAgents: true,
          readAgents: true,
          generateAgentReports: true,
        },
        integrations: {},
      } as any);

      const results = render({
        ...defaultProps,
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Maintenance and diagnostics');

      const exportToCSVButton = results.queryByTestId('bulkAgentExportBtn');
      expect(exportToCSVButton).toBeInTheDocument();
      expect(exportToCSVButton).toBeEnabled();
    });
  });

  describe('When in query selection mode', () => {
    it('should show top-level actions for all agents', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectionMode: 'query',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      // Check top-level items
      expect(results.getByText('Add / remove tags').closest('button')!).toBeEnabled();
      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      expect(results.getByText('Upgrade 10 agents').closest('button')!).toBeEnabled();
    });

    it('should show correct agent counts excluding managed agents', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: (licenseType: string) => licenseType === 'enterprise',
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        totalManagedAgentIds: ['agentId1', 'agentId2'],
        selectionMode: 'query',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      // Should show 8 agents (10 - 2 managed)
      expect(results.getByText('Upgrade 8 agents').closest('button')!).toBeEnabled();

      await navigateToSubmenu(results, 'Security and removal');

      expect(results.getByText('Unenroll 8 agents').closest('button')!).toBeEnabled();
    });

    it('should generate a correct kuery to select agents when no managed agents are listed', async () => {
      const results = render({
        ...defaultProps,
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      await act(async () => {
        fireEvent.click(results.getByText('Assign to new policy').closest('button')!);
      });

      expect(jest.mocked(AgentReassignAgentPolicyModal)).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: '(Base query)',
        }),
        expect.anything()
      );
    });

    it('should generate a correct kuery that excludes managed agents', async () => {
      const results = render({
        ...defaultProps,
        totalManagedAgentIds: ['agentId1', 'agentId2'],
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      expect(results.getByText('Assign to new policy').closest('button')!).toBeEnabled();
      await act(async () => {
        fireEvent.click(results.getByText('Assign to new policy').closest('button')!);
      });

      expect(jest.mocked(AgentReassignAgentPolicyModal)).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: '((Base query)) AND NOT (fleet-agents.agent.id : ("agentId1" or "agentId2"))',
        }),
        expect.anything()
      );
    });

    it('should not show the Remove root privilege button when the feature flag is disabled', async () => {
      mockedExperimentalFeaturesService.get.mockReturnValue({
        enableAgentPrivilegeLevelChange: false,
      } as any);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1', tags: ['oldTag'] }, { id: 'agent2' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      // Security submenu should exist but not have the privilege change option
      await navigateToSubmenu(results, 'Security and removal');

      expect(results.queryByText(/Remove root privilege/)).not.toBeInTheDocument();
    });

    it('should show enabled CSV action if user has generateAgentReports permission', async () => {
      mockStartServices(false);
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          allAgents: true,
          readAgents: true,
          generateAgentReports: true,
        },
        integrations: {},
      } as any);

      const results = render({
        ...defaultProps,
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Maintenance and diagnostics');

      const exportToCSVButton = results.queryByTestId('bulkAgentExportBtn');
      expect(exportToCSVButton).toBeInTheDocument();
      expect(exportToCSVButton).toBeEnabled();
    });

    it('should show disabled CSV action if user does not have generateAgentReports permission', async () => {
      mockStartServices(true);
      jest.mocked(useAuthz).mockReturnValue({
        fleet: {
          allAgents: true,
          readAgents: true,
          generateAgentReports: false,
        },
        integrations: {},
      } as any);

      const results = render({
        ...defaultProps,
        selectionMode: 'query',
        currentQuery: '(Base query)',
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      await navigateToSubmenu(results, 'Maintenance and diagnostics');

      const exportToCSVButton = results.queryByTestId('bulkAgentExportBtn');
      expect(exportToCSVButton).toBeInTheDocument();
      expect(exportToCSVButton).toBeDisabled();
    });
  });

  describe('Menu hierarchy', () => {
    it('should render all submenu groups at root level', async () => {
      mockedUseLicence.mockReturnValue({
        hasAtLeast: () => true,
      } as unknown as LicenseService);

      const results = render({
        ...defaultProps,
        selectedAgents: [{ id: 'agent1' }] as Agent[],
      });

      const bulkActionsButton = results.getByTestId('agentBulkActionsButton');
      await act(async () => {
        fireEvent.click(bulkActionsButton);
      });

      // Verify all three submenu groups exist at root level
      expect(results.getByText('Upgrade management')).toBeInTheDocument();
      expect(results.getByText('Maintenance and diagnostics')).toBeInTheDocument();
      expect(results.getByText('Security and removal')).toBeInTheDocument();
    });
  });
});
