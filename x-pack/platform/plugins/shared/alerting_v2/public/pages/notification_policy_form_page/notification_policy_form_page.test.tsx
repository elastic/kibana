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

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn((token: unknown) => {
    const tokenStr = String(token);
    if (tokenStr.includes('application')) {
      return { navigateToUrl: mockNavigateToUrl };
    }
    if (tokenStr.includes('http')) {
      return { basePath: mockBasePath };
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
  group_by: ['host.name', 'service.name'],
  throttle: { interval: '5m' },
  destinations: [{ type: 'workflow', id: 'workflow-2' }],
  createdBy: 'elastic',
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedBy: 'elastic',
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
      expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Save');
    });

    it('submits create payload on save', async () => {
      const user = userEvent.setup();
      renderPage();

      // Select a workflow destination
      const destinationsCombobox = within(screen.getByTestId('destinationsInput'));
      await user.click(destinationsCombobox.getByTestId('comboBoxSearchInput'));
      await user.click(await screen.findByText('Workflow 1'));

      await user.type(screen.getByTestId(TEST_SUBJ.nameInput), 'Policy from test');
      await user.tab();
      await user.type(screen.getByTestId(TEST_SUBJ.descriptionInput), 'Description from test');
      await user.tab();

      const saveButton = screen.getByTestId(TEST_SUBJ.submitButton);
      await waitFor(() => expect(saveButton).toBeEnabled());
      await user.click(saveButton);

      expect(mockCreateMutate).toHaveBeenCalledTimes(1);
      expect(mockCreateMutate).toHaveBeenCalledWith(
        {
          name: 'Policy from test',
          description: 'Description from test',
          destinations: [{ type: 'workflow', id: 'workflow-1' }],
        },
        expect.objectContaining({ onSuccess: expect.any(Function) })
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
      expect(screen.getByTestId(TEST_SUBJ.submitButton)).toHaveTextContent('Update');
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
            matcher: 'data.severity : "critical"',
            group_by: ['host.name', 'service.name'],
            throttle: { interval: '5m' },
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
