/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import moment from 'moment';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import { coreMock } from '@kbn/core/public/mocks';
import { ReportTypeData, ScheduledReport } from '../../types';
import { getReportingHealth } from '../apis/get_reporting_health';
import { testQueryClient } from '../test_utils/test_query_client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ScheduledReportFlyoutContent } from './scheduled_report_flyout_content';
import { scheduleReport } from '../apis/schedule_report';
import { ScheduledReportApiJSON } from '../../../server/types';
import * as useDefaultTimezoneModule from '../hooks/use_default_timezone';

// Mock Kibana hooks and context
jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: () => 'UTC',
}));

jest.mock(
  '@kbn/response-ops-recurring-schedule-form/components/recurring_schedule_form_fields',
  () => ({
    RecurringScheduleFormFields: () => <div data-test-subj="recurring-schedule-form-fields" />,
  })
);

jest.mock('../apis/get_reporting_health');
const mockGetReportingHealth = jest.mocked(getReportingHealth);
mockGetReportingHealth.mockResolvedValue({
  isSufficientlySecure: true,
  hasPermanentEncryptionKey: true,
  areNotificationsEnabled: true,
});

jest.mock('../apis/schedule_report');
const mockScheduleReport = jest.mocked(scheduleReport);
mockScheduleReport.mockResolvedValue({
  job: {
    id: '8c5529c0-67ed-41c4-8a1b-9a97bdc11d27',
    jobtype: 'printable_pdf_v2',
    created_at: '2025-06-17T15:50:52.879Z',
    created_by: 'elastic',
    meta: {
      isDeprecated: false,
      layout: 'preserve_layout',
      objectType: 'dashboard',
    },
    schedule: {
      rrule: {
        tzid: 'UTC',
        byhour: [17],
        byminute: [50],
        freq: 3,
        interval: 1,
        byweekday: ['TU'],
      },
    },
  } as unknown as ScheduledReportApiJSON,
});

const objectType = 'dashboard';
const sharingData = {
  title: 'Title',
  reportingDisabled: false,
  locatorParams: {
    id: 'DASHBOARD_APP_LOCATOR',
    params: {
      dashboardId: 'f09d5bbe-da16-4975-a04c-ad03c84e586b',
      preserveSavedFilters: true,
      viewMode: 'view',
      useHash: false,
      timeRange: {
        from: 'now-15m',
        to: 'now',
      },
    },
  },
};
const scheduledReport = {
  title: 'Title',
  reportTypeId: 'printablePdfV2',
} as ScheduledReport;
const availableFormats: ReportTypeData[] = [
  {
    id: 'printablePdfV2',
    label: 'PDF',
  },
  {
    id: 'pngV2',
    label: 'PNG',
  },
  {
    id: 'csv_searchsource',
    label: 'CSV',
  },
];

const mockApiClient = {
  getDecoratedJobParams: jest.fn().mockImplementation((params) => params),
} as unknown as ReportingAPIClient;

const mockOnClose = jest.fn();

const TestProviders = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={testQueryClient}>{children}</QueryClientProvider>
);

const TEST_EMAIL = 'test@email.com';

const coreServices = coreMock.createStart();
const mockSuccessToast = jest.fn();
const mockErrorToast = jest.fn();
coreServices.notifications.toasts.addSuccess = mockSuccessToast;
coreServices.notifications.toasts.addError = mockErrorToast;
const mockValidateEmailAddresses = jest.fn().mockReturnValue([]);
const mockKibanaServices = {
  ...coreServices,
  application: {
    ...coreServices.application,
    capabilities: {
      ...coreServices.application.capabilities,
      manageReporting: { show: true },
    },
  },
  actions: {
    validateEmailAddresses: mockValidateEmailAddresses,
  },
  userProfile: {
    getCurrent: jest.fn().mockResolvedValue({ user: { email: TEST_EMAIL } }),
  },
};
const defaultTimezone = moment.tz.guess();
const timezoneSpy = jest
  .spyOn(useDefaultTimezoneModule, 'useDefaultTimezone')
  .mockReturnValue({ defaultTimezone, isBrowser: true });

describe('ScheduledReportFlyoutContent', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: mockKibanaServices,
    });
    jest.clearAllMocks();
    testQueryClient.clear();
  });

  it('should not render the flyout footer when the form is in readOnly mode', () => {
    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
          readOnly={true}
        />
      </TestProviders>
    );

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('should show a callout in case of errors while fetching reporting health', async () => {
    mockGetReportingHealth.mockRejectedValueOnce({});
    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    expect(
      await screen.findByText('Reporting health is a prerequisite to create scheduled exports')
    ).toBeInTheDocument();
  });

  it('should show a callout in case of unmet prerequisites in the reporting health', async () => {
    mockGetReportingHealth.mockResolvedValueOnce({
      isSufficientlySecure: false,
      hasPermanentEncryptionKey: false,
      areNotificationsEnabled: false,
    });
    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    expect(await screen.findByText('Cannot schedule reports')).toBeInTheDocument();
  });

  it('should render the initial form fields when all the prerequisites are met', async () => {
    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    expect(await screen.findByText('Report name')).toBeInTheDocument();
    expect(await screen.findByText('File type')).toBeInTheDocument();
    expect(await screen.findByText('Send by email')).toBeInTheDocument();
  });

  it('should disable the To field when user is not reporting manager', async () => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...mockKibanaServices,
        application: {
          ...mockKibanaServices.application,
          capabilities: {
            ...mockKibanaServices.application.capabilities,
            manageReporting: { show: false },
          },
        },
      },
    });

    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    const toggle = await screen.findByText('Send by email');
    await userEvent.click(toggle);

    const emailField = await screen.findByTestId('emailRecipientsCombobox');
    const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
    expect(emailInput).toBeDisabled();
    expect(screen.getByText('Sensitive information')).toBeInTheDocument();
  });

  it('should show a warning callout when the notification email connector is missing', async () => {
    mockGetReportingHealth.mockResolvedValueOnce({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
      areNotificationsEnabled: false,
    });
    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    expect(await screen.findByText("Email connector hasn't been created yet")).toBeInTheDocument();
  });

  it('should submit the form successfully and call onClose', async () => {
    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    const submitButton = await screen.findByRole('button', { name: 'Schedule exports' });
    await userEvent.click(submitButton);

    await waitFor(() => expect(mockScheduleReport).toHaveBeenCalled());
    expect(mockSuccessToast).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show error toast and not call onClose on form submission failure', async () => {
    mockScheduleReport.mockRejectedValueOnce(new Error('Failed to schedule report'));

    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    const submitButton = await screen.findByRole('button', { name: 'Schedule exports' });
    await userEvent.click(submitButton);

    await waitFor(() => expect(mockErrorToast).toHaveBeenCalled());
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('should not submit if required fields are empty', async () => {
    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={{ title: '', reportTypeId: scheduledReport.reportTypeId }}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    const submitButton = await screen.findByRole('button', { name: 'Schedule exports' });
    await userEvent.click(submitButton);

    await waitFor(() => expect(mockScheduleReport).not.toHaveBeenCalled());
  });

  it('should show validation error on invalid email', async () => {
    mockValidateEmailAddresses.mockReturnValueOnce([{ valid: false, reason: 'notAllowed' }]);

    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={scheduledReport}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    await userEvent.click(await screen.findByText('Send by email'));
    const emailField = await screen.findByTestId('emailRecipientsCombobox');
    const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
    fireEvent.change(emailInput, { target: { value: 'unallowed@email.com' } });
    fireEvent.keyDown(emailInput, { key: 'Enter', code: 'Enter' });

    const submitButton = await screen.findByRole('button', { name: 'Schedule exports' });
    await userEvent.click(submitButton);

    expect(mockValidateEmailAddresses).toHaveBeenCalled();
    expect(emailInput).not.toBeValid();
  });

  it('should use default values for startDate and timezone if not provided', async () => {
    const systemTime = moment('2025-07-01');
    jest.useFakeTimers().setSystemTime(systemTime.toDate());

    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={{ reportTypeId: 'printablePdfV2' }}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    const timezoneField = await screen.findByTestId('timezoneCombobox');
    expect(within(timezoneField).getByText(defaultTimezone)).toBeInTheDocument();

    const startDatePicker = await screen.findByTestId('startDatePicker');
    const startDateInput = within(startDatePicker).getByRole('textbox');
    const startDateValue = startDateInput.getAttribute('value')!;
    expect(startDateValue).toEqual(systemTime.format('MM/DD/YYYY hh:mm A'));

    timezoneSpy.mockRestore();
    jest.useRealTimers();
  });

  it('should show a validation error if startDate is in the past', async () => {
    const systemTime = moment('2025-07-02');
    jest.useFakeTimers().setSystemTime(systemTime.toDate());

    render(
      <TestProviders>
        <ScheduledReportFlyoutContent
          apiClient={mockApiClient}
          objectType={objectType}
          sharingData={sharingData}
          scheduledReport={{
            reportTypeId: 'printablePdfV2',
          }}
          availableReportTypes={availableFormats}
          onClose={mockOnClose}
        />
      </TestProviders>
    );

    const startDatePicker = await screen.findByTestId('startDatePicker');
    const startDateInput = within(startDatePicker).getByRole('textbox');
    fireEvent.change(startDateInput, { target: { value: '07/01/2025 10:00 AM' } });
    fireEvent.blur(startDateInput);

    expect(await screen.findByText('Start date must be in the future')).toBeInTheDocument();

    timezoneSpy.mockRestore();
    jest.useRealTimers();
  });
});
