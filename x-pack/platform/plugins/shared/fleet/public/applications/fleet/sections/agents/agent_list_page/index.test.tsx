/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { RenderResult } from '@testing-library/react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import type { GetAgentPoliciesResponse } from '../../../../../../common';
import { createFleetTestRendererMock } from '../../../../../mock';
import { sendGetAgentsForRq, sendGetAgentStatus } from '../../../hooks';

import { AgentListPage } from '.';

jest.mock('../../../../integrations/hooks/use_confirm_force_install', () => ({
  useConfirmForceInstall: jest.fn(),
}));

jest.mock('./hooks/use_missing_encryption_key_callout', () => ({
  useMissingEncryptionKeyCallout: jest.fn().mockReturnValue([true, jest.fn()]),
}));

jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  UIExtensionsContext: {
    Provider: (props: any) => {
      return props.children;
    },
  },
  sendGetAgentsForRq: jest.fn(),
  useGetAgentPolicies: jest.fn().mockReturnValue({
    data: {
      items: [
        { id: 'policy1', is_managed: false },
        { id: 'managed_policy', is_managed: true },
      ],
    } as GetAgentPoliciesResponse,
    isLoading: false,
    resendRequest: jest.fn(),
  }),
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
  sendGetAgentStatus: jest.fn(),
  sendBulkGetAgentPoliciesForRq: jest.fn().mockResolvedValue({
    items: [
      { id: 'policy1', is_managed: false },
      { id: 'managed_policy', is_managed: true },
    ],
  }),
  sendGetAgentPolicies: jest.fn().mockResolvedValue({ data: { items: [] } }),
  sendGetAgentTagsForRq: jest.fn().mockReturnValue({ items: ['tag1', 'tag2'] }),
  useAuthz: jest
    .fn()
    .mockReturnValue({ fleet: { all: true, allAgents: true, readAgents: true }, integrations: {} }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    cloud: {},
    data: { dataViews: { getFieldsForWildcard: jest.fn() } },
    docLinks: { links: { kibana: { secureSavedObject: 'my-link' } } },
    uiSettings: {
      get: jest.fn(),
    },
    storage: {
      get: jest.fn(),
    },
  }),
  useBreadcrumbs: jest.fn(),
  useLink: jest.fn().mockReturnValue({ getHref: jest.fn() }),
  useUrlParams: jest.fn().mockReturnValue({ urlParams: { kuery: '' } }),
  useKibanaVersion: jest.fn().mockReturnValue('8.3.0'),
  useFleetServerUnhealthy: jest.fn().mockReturnValue({
    isUnhealthy: false,
    isLoading: false,
  }),
}));

// Create a stateful mock for useSessionAgentListState
const mockSessionState = {
  search: '',
  selectedAgentPolicies: [],
  selectedStatus: ['healthy', 'unhealthy', 'orphaned', 'updating', 'offline'],
  selectedTags: [],
  showUpgradeable: false,
  sort: { field: 'enrolled_at', direction: 'desc' },
  page: { index: 0, size: 20 },
};

const mockOnTableChange = jest.fn((changes: any) => {
  if (changes.sort) {
    mockSessionState.sort = changes.sort;
  }
  if (changes.page) {
    mockSessionState.page = changes.page;
  }
});

jest.mock('./hooks/use_session_agent_list_state', () => ({
  useSessionAgentListState: jest.fn(() => ({
    ...mockSessionState,
    updateTableState: jest.fn(),
    onTableChange: mockOnTableChange,
    clearFilters: jest.fn(),
    resetToDefaults: jest.fn(),
  })),
  getDefaultAgentListState: jest.fn(() => ({
    search: '',
    selectedAgentPolicies: [],
    selectedStatus: ['healthy', 'unhealthy', 'orphaned', 'updating', 'offline'],
    selectedTags: [],
    showUpgradeable: false,
    sort: { field: 'enrolled_at', direction: 'desc' },
    page: { index: 0, size: 20 },
  })),
  defaultAgentListState: {
    search: '',
    selectedAgentPolicies: [],
    selectedStatus: ['healthy', 'unhealthy', 'orphaned', 'updating', 'offline'],
    selectedTags: [],
    showUpgradeable: false,
    sort: { field: 'enrolled_at', direction: 'desc' },
    page: { index: 0, size: 20 },
  },
}));

jest.mock('./components/search_and_filter_bar', () => {
  return {
    SearchAndFilterBar: () => <>SearchAndFilterBar</>,
  };
});

const mockedSendGetAgentsForRq = sendGetAgentsForRq as jest.Mock;
const mockedSendGetAgentStatus = sendGetAgentStatus as jest.Mock;

function renderAgentList() {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(<AgentListPage />);

  return { utils };
}

describe('agent_list_page', () => {
  const mapAgents = (ids: string[]) =>
    ids.map((agent) => ({
      id: agent,
      active: true,
      policy_id: 'policy1',
      local_metadata: { host: { hostname: agent } },
    }));

  let utils: RenderResult;

  describe('handling slow agent status request', () => {
    beforeEach(async () => {
      mockedSendGetAgentsForRq
        .mockResolvedValueOnce({
          items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent5']),
          total: 6,
          statusSummary: {
            online: 6,
          },
        })
        .mockResolvedValueOnce({
          items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent6']),
          total: 6,
          statusSummary: {
            online: 6,
          },
        });
      jest.useFakeTimers({ legacyFakeTimers: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not send another agents status request if first one takes longer', () => {
      mockedSendGetAgentStatus.mockImplementation(async () => {
        const sleep = () => {
          return new Promise((res) => {
            setTimeout(() => res({}), 35000);
          });
        };
        await sleep();
        return {
          data: {
            results: {
              inactive: 0,
            },
          },
        };
      });
      ({ utils } = renderAgentList());

      act(() => {
        jest.advanceTimersByTime(65000);
      });

      expect(mockedSendGetAgentStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('selection change', () => {
    beforeEach(async () => {
      mockedSendGetAgentsForRq.mockResolvedValue({
        items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent6']),
        total: 6,
        statusSummary: {
          online: 6,
        },
      });
      mockedSendGetAgentStatus.mockResolvedValue({
        data: {
          results: {
            inactive: 0,
          },
          totalInactive: 0,
        },
      });
      jest.useFakeTimers({ legacyFakeTimers: true });

      await act(async () => {
        ({ utils } = renderAgentList());
      });

      await waitFor(() => {
        expect(utils.getByText('Showing 6 agents')).toBeInTheDocument();
      });

      await act(async () => {
        const selectAll = utils.container.querySelector('[data-test-subj="checkboxSelectAll"]');
        fireEvent.click(selectAll!);
      });

      await waitFor(() => {
        utils.getByText('5 agents selected');
      });

      await act(async () => {
        fireEvent.click(utils.getByText('Select everything on all pages'));
      });

      utils.getByText('All agents selected');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should not set selection mode when agent selection changed automatically', async () => {
      act(() => {
        jest.runOnlyPendingTimers();
      });

      await waitFor(() => {
        expect(utils.getByText('agent6')).toBeInTheDocument();
      });

      utils.getByText('All agents selected');

      expect(
        utils
          .getByText('agent6')
          .closest('tr')!
          .getAttribute('class')!
          .includes('euiTableRow-isSelected')
      ).toBeTruthy();
    });

    it('should set selection mode when agent selection changed manually', async () => {
      await act(async () => {
        fireEvent.click(utils.getAllByRole('checkbox')[3]);
      });

      utils.getByText('4 agents selected');
    });

    it('should pass sort parameters on table sort', async () => {
      await act(async () => {
        fireEvent.click(utils.getByTitle('Last activity'));
      });

      expect(mockedSendGetAgentsForRq).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'last_checkin',
          sortOrder: 'asc',
        })
      );
    });

    it('should pass keyword field on table sort on version', async () => {
      await act(async () => {
        fireEvent.click(utils.getByTitle('Version'));
      });

      expect(mockedSendGetAgentsForRq).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'local_metadata.elastic.agent.version.keyword',
          sortOrder: 'asc',
        })
      );
    });

    it('should pass keyword field on table sort on hostname', async () => {
      await act(async () => {
        fireEvent.click(utils.getByTitle('Host'));
      });

      expect(mockedSendGetAgentsForRq).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'local_metadata.host.hostname.keyword',
          sortOrder: 'asc',
        })
      );
    });
  });

  describe('Uninstall agent', () => {
    let renderResult: RenderResult;

    /**
     * Helper to navigate into a submenu panel in the hierarchical menu.
     */
    async function navigateToSubmenu(submenuText: string) {
      const submenuButton = renderResult.getByText(submenuText).closest('button');
      if (submenuButton) {
        await act(async () => {
          fireEvent.click(submenuButton);
        });
        // Wait a bit for panel transition
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    beforeEach(async () => {
      mockedSendGetAgentsForRq.mockResolvedValue({
        items: [
          {
            id: 'agent1',
            active: true,
            policy_id: 'policy1',
            local_metadata: { host: { hostname: 'agent1' } },
          },
          {
            id: 'agent2',
            active: true,
            policy_id: 'managed_policy',
            local_metadata: { host: { hostname: 'agent2' } },
          },
        ],
        total: 2,
        statusSummary: {
          online: 2,
        },
      });
      mockedSendGetAgentStatus.mockResolvedValue({
        data: { results: { inactive: 0 }, totalInactive: 0 },
      });

      const renderer = createFleetTestRendererMock();

      await act(async () => {
        renderResult = renderer.render(<AgentListPage />);
      });

      await waitFor(() => {
        expect(renderResult.queryByText('Showing 2 agents')).toBeInTheDocument();
      });
    });

    it('should not render "Uninstall agent" menu item for managed Agent', async () => {
      expect(renderResult.queryByTestId('uninstallAgentMenuItem')).not.toBeInTheDocument();

      // Open the actions menu for managed agent (agent2)
      await act(async () => {
        fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[1]);
      });

      // For managed agents, "Security and removal" submenu should not exist
      expect(renderResult.queryByText('Security and removal')).not.toBeInTheDocument();
      expect(renderResult.queryByTestId('uninstallAgentMenuItem')).not.toBeInTheDocument();
    });

    it('should render "Uninstall agent" menu item for not managed Agent', async () => {
      expect(renderResult.queryByTestId('uninstallAgentMenuItem')).not.toBeInTheDocument();

      // Open the actions menu for non-managed agent (agent1)
      await act(async () => {
        fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[0]);
      });

      // Navigate to "Security and removal" submenu
      await navigateToSubmenu('Security and removal');

      await waitFor(() => {
        expect(renderResult.queryByTestId('uninstallAgentMenuItem')).toBeInTheDocument();
      });
    });

    it('should open uninstall commands flyout when clicking on "Uninstall agent"', async () => {
      // Open the actions menu for non-managed agent (agent1)
      await act(async () => {
        fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[0]);
      });

      // Navigate to "Security and removal" submenu
      await navigateToSubmenu('Security and removal');

      await waitFor(() => {
        expect(renderResult.queryByTestId('uninstallAgentMenuItem')).toBeInTheDocument();
      });

      expect(renderResult.queryByTestId('uninstall-command-flyout')).not.toBeInTheDocument();

      await act(async () => {
        fireEvent.click(renderResult.getByTestId('uninstallAgentMenuItem'));
      });

      expect(renderResult.queryByTestId('uninstall-command-flyout')).toBeInTheDocument();
    });
  });
});
