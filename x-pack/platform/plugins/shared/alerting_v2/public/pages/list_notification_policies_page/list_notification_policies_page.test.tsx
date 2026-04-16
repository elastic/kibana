/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { I18nProvider } from '@kbn/i18n-react';
import { MemoryRouter } from 'react-router-dom';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ListNotificationPoliciesPage } from './list_notification_policies_page';

const mockNavigateToUrl = jest.fn();
const mockGetUrlForApp = jest.fn();
const mockUseFetchNotificationPolicies = jest.fn();
const mockCreateNotificationPolicy = jest.fn();
const mockDeleteNotificationPolicy = jest.fn();
const mockEnableNotificationPolicy = jest.fn();
const mockDisableNotificationPolicy = jest.fn();
const mockSnoozeNotificationPolicy = jest.fn();
const mockUnsnoozeNotificationPolicy = jest.fn();
const mockSettingsClientGet = jest.fn();
const mockUseFetchWorkflow = jest.fn();

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

    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../hooks/use_fetch_notification_policies', () => ({
  useFetchNotificationPolicies: (...args: unknown[]) => mockUseFetchNotificationPolicies(...args),
}));

jest.mock('../../hooks/use_create_notification_policy', () => ({
  useCreateNotificationPolicy: () => ({ mutate: mockCreateNotificationPolicy }),
}));

jest.mock('../../hooks/use_delete_notification_policy', () => ({
  useDeleteNotificationPolicy: () => ({
    mutate: mockDeleteNotificationPolicy,
    isLoading: false,
  }),
}));

jest.mock('../../hooks/use_enable_notification_policy', () => ({
  useEnableNotificationPolicy: () => ({
    mutate: mockEnableNotificationPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../hooks/use_disable_notification_policy', () => ({
  useDisableNotificationPolicy: () => ({
    mutate: mockDisableNotificationPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../hooks/use_snooze_notification_policy', () => ({
  useSnoozeNotificationPolicy: () => ({
    mutate: mockSnoozeNotificationPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

jest.mock('../../hooks/use_unsnooze_notification_policy', () => ({
  useUnsnoozeNotificationPolicy: () => ({
    mutate: mockUnsnoozeNotificationPolicy,
    isLoading: false,
    variables: undefined,
  }),
}));

const mockUpdateNotificationPolicyApiKey = jest.fn();
jest.mock('../../hooks/use_update_notification_policy_api_key', () => ({
  useUpdateNotificationPolicyApiKey: () => ({
    mutate: mockUpdateNotificationPolicyApiKey,
  }),
}));

const mockBulkAction = jest.fn();
jest.mock('../../hooks/use_bulk_action_notification_policies', () => ({
  useBulkActionNotificationPolicies: () => ({
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

jest.mock('../../components/notification_policy/delete_confirmation_modal', () => ({
  DeleteNotificationPolicyConfirmModal: () => null,
}));

jest.mock('../../components/notification_policy/notification_policy_snooze_popover', () => ({
  NotificationPolicySnoozePopover: () => <span>Snooze popover</span>,
}));

jest.mock('../../components/notification_policy/notification_policy_state_badge', () => ({
  NotificationPolicyStateBadge: () => <span>State badge</span>,
}));

jest.mock('./components/notification_policy_actions_cell', () => ({
  NotificationPolicyActionsCell: () => <span>Actions cell</span>,
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const createPolicy = (
  overrides: Partial<NotificationPolicyResponse> = {}
): NotificationPolicyResponse => ({
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
  throttle: { strategy: undefined, interval: undefined },
  snoozedUntil: null,
  auth: {
    owner: 'elastic',
    createdByUser: false,
  },
  createdBy: 'elastic_profile_uid',
  createdByUsername: 'elastic',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedBy: 'elastic_profile_uid',
  updatedByUsername: 'elastic',
  updatedAt: '2026-01-02T03:04:05.000Z',
  ...overrides,
});

const renderPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <I18nProvider>
          <ListNotificationPoliciesPage />
        </I18nProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('ListNotificationPoliciesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
    mockUseFetchNotificationPolicies.mockReturnValue({
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

  it('formats updatedAt using the user date format setting', () => {
    renderPage();

    expect(mockSettingsClientGet).toHaveBeenCalledWith('dateFormat');
    expect(screen.getByText('mock formatted date')).not.toBeNull();
  });

  it('does not render destination or refresh controls and fetches without destinationType', () => {
    renderPage();

    expect(screen.queryByLabelText('Filter by destination type')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Refresh' })).toBeNull();

    expect(mockUseFetchNotificationPolicies).toHaveBeenCalled();
    expect(mockUseFetchNotificationPolicies.mock.calls[0][0]).not.toHaveProperty('destinationType');
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
});
