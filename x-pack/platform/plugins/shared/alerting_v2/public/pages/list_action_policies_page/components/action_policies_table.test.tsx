/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ListPageTestProviders } from '../../../test_utils/test_providers';
import { ActionPoliciesTable } from './action_policies_table';

const mockNavigateToUrl = jest.fn();
const mockGetUrlForApp = jest.fn();
const mockFindItems = jest.fn();
const mockCreateActionPolicy = jest.fn();
const mockDeleteActionPolicy = jest.fn();
const mockEnableActionPolicy = jest.fn();
const mockDisableActionPolicy = jest.fn();
const mockSnoozeActionPolicy = jest.fn();
const mockUnsnoozeActionPolicy = jest.fn();
const mockSettingsClientGet = jest.fn();
const mockUseFetchWorkflow = jest.fn();
const mockBulkGet = jest.fn();

const WRITE_CAPABILITIES = { alerting_v2_action_policies: { read: true, all: true } };
const READ_ONLY_CAPABILITIES = { alerting_v2_action_policies: { read: true, all: false } };
let mockCapabilities: Record<string, Record<string, boolean>> = WRITE_CAPABILITIES;

jest.mock('@kbn/core-di-browser', () => {
  const { UserCapabilities: ActualUserCapabilities } = jest.requireActual(
    '../../../services/user_capabilities'
  );
  return {
    useService: (token: unknown) => {
      if (token === ActualUserCapabilities) {
        return new ActualUserCapabilities({ capabilities: mockCapabilities });
      }
      if (token === 'application') {
        return { navigateToUrl: mockNavigateToUrl, getUrlForApp: mockGetUrlForApp };
      }
      if (token === 'chrome') {
        return { docTitle: { change: jest.fn() } };
      }
      if (token === 'http') {
        return { basePath: { prepend: (path: string) => path } };
      }
      if (token === 'settings') {
        return { client: { get: mockSettingsClientGet } };
      }
      if (token === 'userProfile') {
        return { bulkGet: mockBulkGet };
      }
      return {};
    },
    CoreStart: (key: string) => key,
  };
});

jest.mock('../../../hooks/use_create_action_policy', () => ({
  useCreateActionPolicy: () => ({ mutate: mockCreateActionPolicy }),
}));

jest.mock('../../../hooks/use_delete_action_policy', () => ({
  useDeleteActionPolicy: () => ({ mutate: mockDeleteActionPolicy, isLoading: false }),
}));

jest.mock('../../../hooks/use_enable_action_policy', () => ({
  useEnableActionPolicy: () => ({
    mutate: mockEnableActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../../hooks/use_disable_action_policy', () => ({
  useDisableActionPolicy: () => ({
    mutate: mockDisableActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../../hooks/use_snooze_action_policy', () => ({
  useSnoozeActionPolicy: () => ({
    mutate: mockSnoozeActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../../hooks/use_unsnooze_action_policy', () => ({
  useUnsnoozeActionPolicy: () => ({
    mutate: mockUnsnoozeActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

const mockUpdateActionPolicyApiKey = jest.fn();
jest.mock('../../../hooks/use_update_action_policy_api_key', () => ({
  useUpdateActionPolicyApiKey: () => ({ mutate: mockUpdateActionPolicyApiKey }),
}));

const mockBulkAction = jest.fn();
jest.mock('../../../hooks/use_bulk_action_action_policies', () => ({
  useBulkActionActionPolicies: () => ({ mutate: mockBulkAction, isLoading: false }),
}));

jest.mock('../../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (...args: unknown[]) => mockUseFetchWorkflow(...args),
}));

let mockTagNames: string[] = [];
jest.mock('../../../hooks/use_fetch_tags', () => ({
  useFetchTags: () => ({ data: mockTagNames, isLoading: false }),
}));

jest.mock('../../../hooks/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => ({ data: undefined, isLoading: false }),
}));

jest.mock('../action_policies_data_source', () => ({
  ...jest.requireActual('../action_policies_data_source'),
  useActionPoliciesDataSource: () => ({ findItems: mockFindItems }),
}));

jest.mock('../../../components/action_policy/delete_confirmation_modal', () => ({
  DeleteActionPolicyConfirmModal: () => null,
}));

jest.mock('../../../components/action_policy/action_policy_snooze_popover', () => ({
  ActionPolicySnoozePopover: () => <span>Snooze popover</span>,
}));

jest.mock('../../../components/action_policy/action_policy_state_badge', () => ({
  ActionPolicyStateBadge: () => <span>State badge</span>,
}));

jest.mock('./action_policy_actions_cell', () => ({
  ActionPolicyActionsCell: () => <span>Actions cell</span>,
}));

jest.mock('../../../components/action_policy/details_flyout/action_policy_details_flyout', () => ({
  ActionPolicyDetailsFlyout: ({ policy }: { policy: ActionPolicyResponse }) => (
    <div data-test-subj="mockedDetailsFlyout">Details flyout for {policy.id}</div>
  ),
}));

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  version: 'WzEsMV0=',
  name: 'Policy One',
  description: 'Policy description',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  matcher: null,
  groupBy: null,
  tags: null,
  groupingMode: null,
  throttle: { strategy: undefined, interval: null },
  snoozedUntil: null,
  auth: { owner: 'elastic', createdByUser: false },
  createdBy: 'elastic_profile_uid',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'elastic_profile_uid',
  updatedAt: '2026-01-02T03:04:05.000Z',
  ...overrides,
});

const renderTable = () =>
  render(
    <ListPageTestProviders>
      <ActionPoliciesTable />
    </ListPageTestProviders>
  );

describe('ActionPoliciesTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilities = WRITE_CAPABILITIES;
    mockTagNames = [];

    mockBulkGet.mockResolvedValue([]);
    mockSettingsClientGet.mockReturnValue('[mock formatted date]');
    mockFindItems.mockResolvedValue({
      items: [
        {
          ...createPolicy(),
          title: 'Policy One',
          updatedAt: new Date('2026-01-02T03:04:05.000Z'),
          policy: createPolicy(),
        },
      ],
      total: 1,
    });
    mockGetUrlForApp.mockImplementation((_appId: string, { path }: { path: string }) => {
      return `/app/workflows${path}`;
    });
    mockUseFetchWorkflow.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders the updatedAt column', async () => {
    renderTable();

    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /last updated/i })).toBeInTheDocument()
    );
  });

  it('does not render destination or refresh controls', () => {
    renderTable();

    expect(screen.queryByLabelText('Filter by destination type')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();
  });

  it('renders a workflow count summary in the destinations column', async () => {
    renderTable();

    await waitFor(() => expect(screen.getByText('1 workflow')).toBeInTheDocument());
  });

  it('renders the policy description below the name', async () => {
    renderTable();

    await waitFor(() => {
      expect(screen.getByText('Policy One')).toBeInTheDocument();
      expect(screen.getByText('Policy description')).toBeInTheDocument();
    });
  });

  it('renders columns in the correct order', async () => {
    renderTable();

    await waitFor(() => {
      const columnHeaders = screen
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.trim())
        .filter(Boolean);

      expect(columnHeaders).toEqual(
        expect.arrayContaining([
          'Name',
          'Tags',
          'Destinations',
          'Last updated',
          'Updated by',
          'Enabled',
          'Notify',
          'Actions',
        ])
      );
    });
  });

  it('opens the details flyout when the policy name link is clicked', async () => {
    const user = userEvent.setup();
    renderTable();

    await waitFor(() =>
      expect(screen.getByTestId('content-list-table-item-link')).toBeInTheDocument()
    );

    expect(screen.queryByTestId('mockedDetailsFlyout')).toBeNull();

    await user.click(screen.getByTestId('content-list-table-item-link'));

    expect(screen.getByTestId('mockedDetailsFlyout')).toHaveTextContent(
      'Details flyout for policy-1'
    );
  });

  it('does not render the details flyout until a policy is selected', () => {
    renderTable();

    expect(screen.queryByTestId('mockedDetailsFlyout')).toBeNull();
  });

  describe('State filter', () => {
    const openStateFilter = async () => {
      await waitFor(() =>
        expect(screen.getByTestId('actionPoliciesEnabledFilter')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('actionPoliciesEnabledFilter'));
    };

    const lastFindItemsFilters = () => {
      const calls = mockFindItems.mock.calls;
      return calls[calls.length - 1][0].filters;
    };

    it('renders the State filter button in the toolbar', async () => {
      renderTable();

      await waitFor(() =>
        expect(screen.getByTestId('actionPoliciesEnabledFilter')).toBeInTheDocument()
      );
    });

    const clickFilterOption = async (label: string) => {
      const list = await screen.findByTestId('actionPoliciesEnabledFilter-list');
      fireEvent.click(within(list).getByText(label));
    };

    it('calls findItems with enabled:true when Enabled is selected', async () => {
      renderTable();

      await openStateFilter();
      await clickFilterOption('Enabled');

      await waitFor(() => {
        expect(lastFindItemsFilters().enabled).toMatchObject({ include: ['enabled'] });
      });
    });

    it('calls findItems with enabled:false when Disabled is selected', async () => {
      renderTable();

      await openStateFilter();
      await clickFilterOption('Disabled');

      await waitFor(() => {
        expect(lastFindItemsFilters().enabled).toMatchObject({ include: ['disabled'] });
      });
    });

    it('calls findItems without enabled filter after deselecting the active option', async () => {
      renderTable();

      await openStateFilter();
      await clickFilterOption('Enabled');
      await waitFor(() =>
        expect(lastFindItemsFilters().enabled).toMatchObject({ include: ['enabled'] })
      );

      await openStateFilter();
      await clickFilterOption('Enabled');

      await waitFor(() => {
        expect(lastFindItemsFilters().enabled).toBeUndefined();
      });
    });
  });

  describe('Tags filter', () => {
    const openTagsFilter = async () => {
      await waitFor(() =>
        expect(screen.getByTestId('actionPoliciesTagsFilter')).toBeInTheDocument()
      );
      fireEvent.click(screen.getByTestId('actionPoliciesTagsFilter'));
    };

    const lastFindItemsFilters = () => {
      const calls = mockFindItems.mock.calls;
      return calls[calls.length - 1][0].filters;
    };

    beforeEach(() => {
      mockTagNames = ['critical', 'staging', 'production'];
    });

    it('renders the Tags filter button in the toolbar', async () => {
      renderTable();

      await waitFor(() =>
        expect(screen.getByTestId('actionPoliciesTagsFilter')).toBeInTheDocument()
      );
    });

    it('calls findItems with the selected tag when a tag is chosen', async () => {
      renderTable();

      await openTagsFilter();
      fireEvent.click(await screen.findByText('critical'));

      await waitFor(() => {
        expect(lastFindItemsFilters().tag).toMatchObject({ include: ['critical'] });
      });
    });

    it('calls findItems with multiple tags when several are selected', async () => {
      renderTable();

      await openTagsFilter();
      fireEvent.click(await screen.findByText('critical'));
      await waitFor(() =>
        expect(lastFindItemsFilters().tag).toMatchObject({ include: ['critical'] })
      );

      await openTagsFilter();
      fireEvent.click(await screen.findByText('staging'));

      await waitFor(() => {
        expect(lastFindItemsFilters().tag).toMatchObject({
          include: expect.arrayContaining(['critical', 'staging']),
        });
      });
    });

    it('calls findItems without tag filter after deselecting the active tag', async () => {
      renderTable();

      await openTagsFilter();
      fireEvent.click(await screen.findByText('critical'));
      await waitFor(() =>
        expect(lastFindItemsFilters().tag).toMatchObject({ include: ['critical'] })
      );

      await openTagsFilter();
      fireEvent.click(await screen.findByText('critical'));

      await waitFor(() => {
        expect(lastFindItemsFilters().tag).toBeUndefined();
      });
    });
  });

  describe('Enabled column switch', () => {
    const getSwitch = () => screen.getByRole('switch', { name: /policy one enabled/i });

    it('renders checked when the policy is enabled', async () => {
      renderTable();

      await waitFor(() => expect(getSwitch()).toBeChecked());
    });

    it('renders unchecked when the policy is disabled', async () => {
      mockFindItems.mockResolvedValue({
        items: [
          {
            ...createPolicy({ enabled: false }),
            title: 'Policy One',
            updatedAt: new Date('2026-01-02T03:04:05.000Z'),
            policy: createPolicy({ enabled: false }),
          },
        ],
        total: 1,
      });
      renderTable();

      await waitFor(() => expect(getSwitch()).not.toBeChecked());
    });

    it('calls disablePolicy when toggled off', async () => {
      const user = userEvent.setup();
      renderTable();

      await waitFor(() => expect(getSwitch()).toBeInTheDocument());
      await user.click(getSwitch());

      expect(mockDisableActionPolicy).toHaveBeenCalledWith('policy-1', expect.anything());
      expect(mockEnableActionPolicy).not.toHaveBeenCalled();
    });

    it('calls enablePolicy when toggled on', async () => {
      mockFindItems.mockResolvedValue({
        items: [
          {
            ...createPolicy({ enabled: false }),
            title: 'Policy One',
            updatedAt: new Date('2026-01-02T03:04:05.000Z'),
            policy: createPolicy({ enabled: false }),
          },
        ],
        total: 1,
      });
      const user = userEvent.setup();
      renderTable();

      await waitFor(() => expect(getSwitch()).toBeInTheDocument());
      await user.click(getSwitch());

      expect(mockEnableActionPolicy).toHaveBeenCalledWith('policy-1', expect.anything());
      expect(mockDisableActionPolicy).not.toHaveBeenCalled();
    });

    it('is disabled for read-only users', async () => {
      mockCapabilities = READ_ONLY_CAPABILITIES;
      renderTable();

      await waitFor(() => expect(getSwitch()).toBeDisabled());
    });
  });

  describe('when the user only has read privilege', () => {
    beforeEach(() => {
      mockCapabilities = READ_ONLY_CAPABILITIES;
    });

    it('hides the snooze popover in the notify column', async () => {
      renderTable();

      await waitFor(() => expect(screen.queryByText('Snooze popover')).toBeNull());
    });

    it('does not render row selection checkboxes', async () => {
      renderTable();

      await waitFor(() => expect(screen.queryByTestId('checkboxSelectAll')).toBeNull());
    });

    it('still opens the details flyout from the policy name link', async () => {
      const user = userEvent.setup();
      renderTable();

      await waitFor(() =>
        expect(screen.getByTestId('content-list-table-item-link')).toBeInTheDocument()
      );

      await user.click(screen.getByTestId('content-list-table-item-link'));

      expect(screen.getByTestId('mockedDetailsFlyout')).toHaveTextContent(
        'Details flyout for policy-1'
      );
    });
  });
});
