/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import { I18nProvider } from '@kbn/i18n-react';
import { NotificationPolicyFormPage } from './notification_policy_form_page';

const mockNavigateToUrl = jest.fn();
const mockBasePath = { prepend: jest.fn((path: string) => `/mock${path}`) };

jest.mock('../../components/notification_policy/form/components/matcher_input', () => ({
  MatcherInput: (props: {
    value: string;
    onChange: (v: string) => void;
    'data-test-subj'?: string;
  }) => (
    <input
      data-test-subj={props['data-test-subj']}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn((token: unknown) => {
    const tokenStr = String(token);
    if (tokenStr.includes('application')) {
      return {
        navigateToUrl: mockNavigateToUrl,
        getUrlForApp: jest.fn(
          (appId: string, options?: { path?: string }) =>
            `/app/${appId}${options?.path ? `/${options.path}` : ''}`
        ),
      };
    }
    if (tokenStr.includes('chrome')) {
      return { docTitle: { change: jest.fn() } };
    }
    if (tokenStr.includes('http')) {
      return { basePath: mockBasePath };
    }
    if (tokenStr.includes('uiSettings')) {
      return { get: () => true };
    }
    return {};
  }),
  CoreStart: jest.fn((name: string) => `CoreStart(${name})`),
}));

const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();

jest.mock('../../hooks/use_create_notification_policy', () => ({
  useCreateNotificationPolicy: () => ({
    mutate: mockCreateMutate,
    isLoading: false,
  }),
}));

jest.mock('../../hooks/use_update_notification_policy', () => ({
  useUpdateNotificationPolicy: () => ({
    mutate: mockUpdateMutate,
    isLoading: false,
  }),
}));

const mockUseFetchNotificationPolicy = jest.fn();
jest.mock('../../hooks/use_fetch_notification_policy', () => ({
  useFetchNotificationPolicy: (...args: unknown[]) => mockUseFetchNotificationPolicy(...args),
}));

jest.mock('../../hooks/use_fetch_data_fields', () => ({
  useFetchDataFields: () => ({ data: undefined, isLoading: false }),
}));

jest.mock('../../hooks/use_fetch_workflows', () => ({
  useFetchWorkflows: () => ({
    data: {
      results: [
        { id: 'workflow-1', name: 'Workflow 1' },
        { id: 'workflow-2', name: 'Workflow 2' },
      ],
    },
    isLoading: false,
  }),
}));

const mockUseParams = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => mockUseParams(),
}));

const TEST_SUBJ = {
  pageTitle: 'pageTitle',
  cancelButton: 'cancelButton',
  submitButton: 'submitButton',
  nameInput: 'nameInput',
  descriptionInput: 'descriptionInput',
  loadingSpinner: 'loadingSpinner',
  fetchErrorCallout: 'fetchErrorCallout',
} as const;

const EXISTING_POLICY: NotificationPolicyResponse = {
  id: 'policy-1',
  version: 'WzEsMV0=',
  name: 'Critical production alerts',
  description: 'Routes critical alerts',
  enabled: true,
  matcher: 'data.severity : "critical"',
  groupBy: ['host.name', 'service.name'],
  groupingMode: 'per_field',
  throttle: { strategy: 'time_interval', interval: '5m' },
  snoozedUntil: null,
  destinations: [{ type: 'workflow', id: 'workflow-2' }],
  createdBy: 'elastic',
  createdByUsername: 'elastic',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedBy: 'elastic',
  updatedByUsername: 'elastic',
  updatedAt: '2026-03-01T10:00:00.000Z',
  auth: {
    owner: 'elastic',
    createdByUser: false,
  },
};

const renderPage = () => {
  return render(
    <I18nProvider>
      <NotificationPolicyFormPage />
    </I18nProvider>
  );
};

describe('NotificationPolicyFormPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchNotificationPolicy.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  describe('create mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({});
    });

    it('renders create title and save button', () => {
      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.pageTitle)).toHaveTextContent(
        'Create notification policy'
      );
      expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Create policy');
    });

    it('submits create payload on save', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByTestId(TEST_SUBJ.nameInput), 'Policy from test');
      await user.tab();
      await user.type(screen.getByTestId(TEST_SUBJ.descriptionInput), 'Description from test');
      await user.tab();

      // Select a workflow destination (required field)
      const destinationsCombo = screen.getByTestId('destinationsInput');
      const comboInput = within(destinationsCombo).getByRole('combobox');
      await user.click(comboInput);
      await user.click(await screen.findByRole('option', { name: 'Workflow 1' }));

      const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      await waitFor(() =>
        expect(mockCreateMutate).toHaveBeenCalledWith(
          {
            name: 'Policy from test',
            description: 'Description from test',
            groupingMode: 'per_episode',
            throttle: { strategy: 'on_status_change' },
            destinations: [{ type: 'workflow', id: 'workflow-1' }],
          },
          expect.objectContaining({ onSuccess: expect.any(Function) })
        )
      );
    });

    it('navigates to listing page on cancel', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));

      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        expect.stringContaining('/notification_policies')
      );
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      mockUseParams.mockReturnValue({ id: 'policy-1' });
    });

    it('renders edit title and update button when policy is loaded', () => {
      mockUseFetchNotificationPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.pageTitle)).toHaveTextContent('Edit notification policy');
      expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Update policy');
    });

    it('shows loading state while fetching', () => {
      mockUseFetchNotificationPolicy.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
      });

      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.loadingSpinner)).toBeInTheDocument();
    });

    it('shows error callout when fetch fails', () => {
      mockUseFetchNotificationPolicy.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Not found'),
      });

      renderPage();

      expect(screen.getByTestId(TEST_SUBJ.fetchErrorCallout)).toBeInTheDocument();
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });

    it('submits update payload on save', async () => {
      const user = userEvent.setup();
      mockUseFetchNotificationPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.nameInput));
      await user.tab();
      await user.click(screen.getByTestId(TEST_SUBJ.descriptionInput));
      await user.tab();

      const updateButton = screen.getByTestId(TEST_SUBJ.submitButton);
      await waitFor(() => expect(updateButton).toBeEnabled());
      await user.click(updateButton);

      expect(mockUpdateMutate).toHaveBeenCalledTimes(1);
      expect(mockUpdateMutate).toHaveBeenCalledWith(
        {
          id: 'policy-1',
          data: {
            version: 'WzEsMV0=',
            name: 'Critical production alerts',
            description: 'Routes critical alerts',
            groupingMode: 'per_field',
            matcher: 'data.severity : "critical"',
            groupBy: ['host.name', 'service.name'],
            throttle: { strategy: 'time_interval', interval: '5m' },
            destinations: [{ type: 'workflow', id: 'workflow-2' }],
          },
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
      );
    });

    it('navigates to listing page on cancel', async () => {
      const user = userEvent.setup();
      mockUseFetchNotificationPolicy.mockReturnValue({
        data: EXISTING_POLICY,
        isLoading: false,
        isError: false,
        error: null,
      });

      renderPage();

      await user.click(screen.getByTestId(TEST_SUBJ.cancelButton));

      expect(mockNavigateToUrl).toHaveBeenCalledWith(
        expect.stringContaining('/notification_policies')
      );
    });
  });
});
