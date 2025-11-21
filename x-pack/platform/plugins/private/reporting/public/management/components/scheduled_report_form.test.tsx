/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { applicationServiceMock, coreMock, httpServiceMock } from '@kbn/core/public/mocks';
import { ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import { mockScheduledReports } from '../../../common/test/fixtures';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { ScheduledReportForm } from './scheduled_report_form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { getReportingHealth } from '../apis/get_reporting_health';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import userEvent from '@testing-library/user-event';
import moment from 'moment';
import * as i18n from '../translations';
import { transformScheduledReport } from '../utils';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
  ReportingAPIClient: jest.fn(),
}));

jest.mock('../hooks/use_get_user_profile_query');
jest.mock('../apis/get_reporting_health');

const mockValidateEmailAddresses = jest.fn().mockReturnValue([]);
const mockReportingHealth = jest.mocked(getReportingHealth);
const mockGetUserProfileQuery = jest.mocked(useGetUserProfileQuery);
const mockedUseUiSetting = jest.mocked(useUiSetting);

describe('ScheduledReportForm', () => {
  const onSubmitForm = jest.fn();
  const onClose = jest.fn();
  const application = applicationServiceMock.createStartContract();
  const http = httpServiceMock.createSetupContract();
  const uiSettings = coreMock.createSetup().uiSettings;
  const mockKibanaServices = {
    application: {
      capabilities: { ...application.capabilities, manageReporting: { show: true } },
    },
    http,
    userProfile: userProfileServiceMock.createStart(),
    actions: {
      validateEmailAddresses: mockValidateEmailAddresses,
    },
  };
  const apiClient = new ReportingAPIClient(http, uiSettings, 'x.x.x');
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  const defaultProps = {
    apiClient,
    scheduledReport: transformScheduledReport(mockScheduledReports[0]),
    availableReportTypes: [],
    onClose,
    onSubmitForm,
  };

  const renderWithProviders = (childComponent: React.ReactElement) => {
    return render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>{childComponent}</QueryClientProvider>
      </IntlProvider>
    );
  };
  let user: ReturnType<typeof userEvent.setup>;
  const today = new Date('2025-11-10T12:00:00.000Z');

  beforeAll(() => {
    moment.tz.setDefault('UTC');
    mockedUseUiSetting.mockReturnValue('UTC');
    window.scrollTo = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: mockKibanaServices,
    });
    mockReportingHealth.mockResolvedValue({
      isSufficientlySecure: true,
      hasPermanentEncryptionKey: true,
      areNotificationsEnabled: true,
    });
    mockGetUserProfileQuery.mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          username: 'testuser',
          full_name: 'Test User',
        },
        uid: '123',
      },
      isLoading: false,
    } as any);
    jest.spyOn(Date, 'now').mockReturnValue(today.getTime());
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    moment.tz.setDefault('Browser');
  });

  it('renders correctly', async () => {
    renderWithProviders(<ScheduledReportForm {...defaultProps} />);

    expect(await screen.findByTestId('scheduleExportForm')).toBeInTheDocument();
    expect(screen.getByText(i18n.SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('scheduleExportSubmitButton')).toBeInTheDocument();
  });

  it('calls onSubmit correctly', async () => {
    user = userEvent.setup({ delay: null });
    renderWithProviders(
      <ScheduledReportForm
        {...defaultProps}
        availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
      />
    );

    const submitButton = await screen.findByTestId('scheduleExportSubmitButton');

    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        {
          recurringSchedule: {
            byweekday: {
              1: true,
              2: false,
              3: false,
              4: false,
              5: false,
              6: false,
              7: false,
            },
            frequency: 3,
          },
          reportTypeId: 'printablePdfV2',
          sendByEmail: false,
          startDate: '2025-11-10T12:00:00.000Z',
          timezone: 'UTC',
          title: 'Scheduled report 1',
        },
        true
      );
    });
  });

  it('should not allow showing the Cc and Bcc fields when user is not reporting manager', async () => {
    user = userEvent.setup({ delay: null });
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...mockKibanaServices,
        application: {
          capabilities: { ...application.capabilities, manageReporting: { show: false } },
        },
      },
    });

    renderWithProviders(<ScheduledReportForm {...defaultProps} />);

    const toggle = await screen.findByText('Send by email');
    await user.click(toggle);

    const emailField = await screen.findByTestId('emailRecipientsCombobox');
    const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
    expect(emailInput).toBeDisabled();
    expect(screen.queryByTestId('showCcBccButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emailCcRecipientsCombobox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emailBccRecipientsCombobox')).not.toBeInTheDocument();
    expect(screen.getByText('Sensitive information')).toBeInTheDocument();
  });

  describe('Edit mode', () => {
    it('disables report type in edit mode', async () => {
      const props = { ...defaultProps, editMode: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('reportTypeIdSelect')).toBeDisabled();
    });

    it('disables send email in edit mode', async () => {
      const props = { ...defaultProps, editMode: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('sendByEmailToggle')).toBeDisabled();
    });

    it('disables email fields in edit mode and hides cc bcc toggle button', async () => {
      user = userEvent.setup({ delay: null });
      renderWithProviders(
        <ScheduledReportForm
          {...defaultProps}
          editMode
          scheduledReport={{
            ...defaultProps.scheduledReport,
            sendByEmail: true,
            emailRecipients: ['to@email.com'],
            emailCcRecipients: ['cc@email.com'],
            emailBccRecipients: ['bccemail.com'],
          }}
        />
      );

      expect(await screen.findByTestId('sendByEmailToggle')).toBeDisabled();
      const emailField = await screen.findByTestId('emailRecipientsCombobox');
      const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
      expect(emailInput).toBeDisabled();
      expect(screen.queryByTestId('showCcBccButton')).not.toBeInTheDocument();
      expect(
        within(screen.getByTestId('emailCcRecipientsCombobox')).getByTestId('comboBoxSearchInput')
      ).toBeDisabled();
      expect(
        within(screen.getByTestId('emailBccRecipientsCombobox')).getByTestId('comboBoxSearchInput')
      ).toBeDisabled();
    });

    it('calls onSubmit correctly in edit mode', async () => {
      user = userEvent.setup({ delay: null });
      const props = {
        ...defaultProps,
        editMode: true,
        availableReportTypes: [{ label: 'PDF', id: 'printablePdfV2' }],
      };
      renderWithProviders(<ScheduledReportForm {...props} />);

      const titleInput = await screen.findByTestId('reportTitleInput');
      await user.clear(titleInput);
      await user.paste('Updated scheduled report title');

      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');

      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmitForm).toHaveBeenCalledWith(
          {
            recurringSchedule: {
              byweekday: {
                1: true,
                2: false,
                3: false,
                4: false,
                5: false,
                6: false,
                7: false,
              },
              frequency: 3,
            },
            reportTypeId: 'printablePdfV2',
            sendByEmail: false,
            startDate: '2025-11-10T12:00:00.000Z',
            timezone: 'UTC',
            title: 'Updated scheduled report title',
          },
          true
        );
      });
    });
  });

  describe('Readonly Mode', () => {
    it('disables title in read-only mode', async () => {
      const props = { ...defaultProps, readOnly: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('reportTitleInput')).toHaveAttribute('readonly');
    });

    it('disables report type in read-only mode', async () => {
      const props = { ...defaultProps, readOnly: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('reportTypeIdSelect')).toBeDisabled();
    });

    it('disables date picker in read-only mode', async () => {
      const props = { ...defaultProps, readOnly: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('startDatePicker-input')).toHaveAttribute('readonly');
    });

    it('disables schedule in read-only mode', async () => {
      const props = { ...defaultProps, readOnly: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('recurringScheduleRepeatSelect')).toBeDisabled();
    });

    it('disables send email in read-only mode', async () => {
      const props = { ...defaultProps, readOnly: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('sendByEmailToggle')).toBeDisabled();
    });

    it('disables submit button in read-only mode', async () => {
      const props = { ...defaultProps, readOnly: true };
      renderWithProviders(<ScheduledReportForm {...props} />);

      expect(await screen.findByTestId('scheduleExportSubmitButton')).toBeDisabled();
    });
  });

  describe('Validation', () => {
    it('shows validation error when title is empty', async () => {
      user = userEvent.setup({ delay: null });
      renderWithProviders(<ScheduledReportForm {...defaultProps} />);

      const titleInput = await screen.findByTestId('reportTitleInput');
      await user.clear(titleInput);

      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');
      await user.click(submitButton);

      expect(onSubmitForm).not.toHaveBeenCalled();

      expect(await screen.findByText('Report file name is required')).toBeInTheDocument();
    });

    it('does not throw error for previous start date when it is not updated in edit mode', async () => {
      user = userEvent.setup();
      const props = {
        ...defaultProps,
        availableReportTypes: [{ id: 'printablePdfV2', label: 'PDF' }],
        editMode: true,
      };

      renderWithProviders(<ScheduledReportForm {...props} />);

      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');
      await user.click(submitButton);

      expect(onSubmitForm).toHaveBeenCalled();
    });
  });
});
