/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { APP_HEADER_TEST_SUBJECTS } from '@kbn/app-header';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ListPageTestProviders } from '../../test_utils/test_providers';
import { ListActionPoliciesPage } from './list_action_policies_page';

const mockNavigateToUrl = jest.fn();
const mockGetUrlForApp = jest.fn();
const mockUseFetchActionPolicies = jest.fn();
const mockCreateActionPolicy = jest.fn();
const mockDeleteActionPolicy = jest.fn();
const mockEnableActionPolicy = jest.fn();
const mockDisableActionPolicy = jest.fn();
const mockSnoozeActionPolicy = jest.fn();
const mockUnsnoozeActionPolicy = jest.fn();
const mockSettingsClientGet = jest.fn();
const mockUseFetchWorkflow = jest.fn();
const mockBulkGet = jest.fn();

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
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
      return {
        client: {
          get: mockSettingsClientGet,
        },
      };
    }
    if (token === 'userProfile') {
      return { bulkGet: mockBulkGet };
    }

    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../hooks/use_fetch_action_policies', () => ({
  useFetchActionPolicies: (...args: unknown[]) => mockUseFetchActionPolicies(...args),
}));

jest.mock('../../hooks/use_create_action_policy', () => ({
  useCreateActionPolicy: () => ({ mutate: mockCreateActionPolicy }),
}));

jest.mock('../../hooks/use_delete_action_policy', () => ({
  useDeleteActionPolicy: () => ({
    mutate: mockDeleteActionPolicy,
    isLoading: false,
  }),
}));

jest.mock('../../hooks/use_enable_action_policy', () => ({
  useEnableActionPolicy: () => ({
    mutate: mockEnableActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../hooks/use_disable_action_policy', () => ({
  useDisableActionPolicy: () => ({
    mutate: mockDisableActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../hooks/use_snooze_action_policy', () => ({
  useSnoozeActionPolicy: () => ({
    mutate: mockSnoozeActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../hooks/use_unsnooze_action_policy', () => ({
  useUnsnoozeActionPolicy: () => ({
    mutate: mockUnsnoozeActionPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

const mockUpdateActionPolicyApiKey = jest.fn();
jest.mock('../../hooks/use_update_action_policy_api_key', () => ({
  useUpdateActionPolicyApiKey: () => ({
    mutate: mockUpdateActionPolicyApiKey,
  }),
}));

const mockBulkAction = jest.fn();
jest.mock('../../hooks/use_bulk_action_action_policies', () => ({
  useBulkActionActionPolicies: () => ({
    mutate: mockBulkAction,
    isLoading: false,
  }),
}));

jest.mock('../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (...args: unknown[]) => mockUseFetchWorkflow(...args),
}));

jest.mock('../../hooks/use_fetch_tags', () => ({
  useFetchTags: () => ({ data: [], isLoading: false }),
}));

jest.mock('../../components/action_policy/delete_confirmation_modal', () => ({
  DeleteActionPolicyConfirmModal: () => null,
}));

jest.mock('../../components/action_policy/action_policy_snooze_popover', () => ({
  ActionPolicySnoozePopover: () => <span>Snooze popover</span>,
}));

jest.mock('../../components/action_policy/action_policy_state_badge', () => ({
  ActionPolicyStateBadge: () => <span>State badge</span>,
}));

jest.mock('./components/action_policy_actions_cell', () => ({
  ActionPolicyActionsCell: () => <span>Actions cell</span>,
}));

jest.mock('../../components/action_policy/details_flyout/action_policy_details_flyout', () => ({
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
  auth: {
    owner: 'elastic',
    createdByUser: false,
  },
  createdBy: 'elastic_profile_uid',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'elastic_profile_uid',
  updatedAt: '2026-01-02T03:04:05.000Z',
  ...overrides,
});

const renderPage = () =>
  render(
    <ListPageTestProviders>
      <ListActionPoliciesPage />
    </ListPageTestProviders>
  );

describe('ListActionPoliciesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockBulkGet.mockResolvedValue([]);
    mockSettingsClientGet.mockReturnValue('[mock formatted date]');
    mockGetUrlForApp.mockImplementation((_appId: string, { path }: { path: string }) => {
      return `/app/workflows${path}`;
    });
    mockUseFetchWorkflow.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    mockUseFetchActionPolicies.mockReturnValue({
      data: {
        items: [createPolicy()],
        total: 1,
        page: 1,
        perPage: 20,
      },
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders the experimental badge in the page header', () => {
    renderPage();

    expect(screen.getByTestId(APP_HEADER_TEST_SUBJECTS.title)).toHaveTextContent('Action Policies');
    expect(screen.getByTestId('alertingV2ExperimentalBadge')).toBeInTheDocument();
  });

  it('navigates to create action policy when the create button is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('createActionPolicyButton'));

    expect(mockNavigateToUrl).toHaveBeenCalledWith(
      '/app/management/alertingV2/action_policies/create'
    );
  });

  it('formats updatedAt using the user date format setting', () => {
    renderPage();

    expect(mockSettingsClientGet).toHaveBeenCalledWith('dateFormat');
    expect(screen.getByText('mock formatted date')).not.toBeNull();
  });

  it('does not render destination or refresh controls and fetches without destinationType', () => {
    renderPage();

    expect(screen.queryByLabelText('Filter by destination type')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();

    expect(mockUseFetchActionPolicies).toHaveBeenCalled();
    expect(mockUseFetchActionPolicies.mock.calls[0][0]).not.toHaveProperty('destinationType');
  });

  it('renders a workflow count summary in the destinations column', () => {
    renderPage();

    expect(screen.getByText('1 workflow')).not.toBeNull();
  });

  it('renders the policy description below the name', () => {
    renderPage();

    expect(screen.getByText('Policy One')).not.toBeNull();
    expect(screen.getByText('Policy description')).not.toBeNull();
  });

  it('renders columns in the correct order', () => {
    renderPage();

    const columnHeaders = screen
      .getAllByRole('columnheader')
      .map((header) => header.textContent?.trim())
      .filter(Boolean);

    expect(columnHeaders).toEqual([
      'Name',
      'Destinations',
      'Tags',
      'Last update',
      'Updated by',
      'State',
      'Notify',
      'Actions',
    ]);
  });

  it('opens the details flyout when the policy name link is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByTestId('mockedDetailsFlyout')).toBeNull();

    await user.click(screen.getByTestId('actionPolicyDetailsLink-policy-1'));

    expect(screen.getByTestId('mockedDetailsFlyout')).toHaveTextContent(
      'Details flyout for policy-1'
    );
  });

  it('does not render the details flyout until a policy is selected', () => {
    renderPage();

    expect(screen.queryByTestId('mockedDetailsFlyout')).toBeNull();
  });
});
