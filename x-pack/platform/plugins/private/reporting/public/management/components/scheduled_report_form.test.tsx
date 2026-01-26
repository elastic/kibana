/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, waitFor, within } from '@testing-library/react';
import { applicationServiceMock, httpServiceMock } from '@kbn/core/public/mocks';
import { useKibana } from '@kbn/reporting-public';
import { mockScheduledReports } from '../../../common/test/fixtures';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import type { ScheduledReportFormProps } from './scheduled_report_form';
import { ScheduledReportForm } from './scheduled_report_form';
import { getReportingHealth } from '../apis/get_reporting_health';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import userEvent from '@testing-library/user-event';
import moment from 'moment';
import * as i18n from '../translations';
import { transformScheduledReport } from '../utils';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

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

  const defaultProps: Pick<
    ScheduledReportFormProps,
    'scheduledReport' | 'availableReportTypes' | 'onClose' | 'onSubmitForm'
  > = {
    scheduledReport: transformScheduledReport(mockScheduledReports[0]),
    availableReportTypes: [],
    onClose,
    onSubmitForm,
  };

  const { queryClient, provider: TestQueryClientProvider } = createTestResponseOpsQueryClient();

  const wrapper = ({ children }: PropsWithChildren) => {
    return (
      <IntlProvider locale="en">
        <TestQueryClientProvider>{children}</TestQueryClientProvider>
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
    render(<ScheduledReportForm {...defaultProps} />, { wrapper });

    expect(await screen.findByTestId('scheduleExportForm')).toBeInTheDocument();
    expect(screen.getByText(i18n.SCHEDULED_REPORT_FORM_DETAILS_SECTION_TITLE)).toBeInTheDocument();
    expect(screen.getByTestId('scheduleExportSubmitButton')).toBeInTheDocument();
  });

  it('calls onSubmit correctly', async () => {
    user = userEvent.setup({ delay: null });
    render(
      <ScheduledReportForm
        {...defaultProps}
        availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
      />,
      { wrapper }
    );

    const submitButton = await screen.findByTestId('scheduleExportSubmitButton');

    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSubmitForm).toHaveBeenCalledWith(
        {
          recurringSchedule: {
            frequency: 2,
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

  describe('when user is not reporting manager', () => {
    it('should disable the email to field, autofill it with user email and hide cc and bcc fields', async () => {
      user = userEvent.setup({ delay: null });
      (useKibana as jest.Mock).mockReturnValue({
        services: {
          ...mockKibanaServices,
          application: {
            capabilities: { ...application.capabilities, manageReporting: { show: false } },
          },
        },
      });

      render(<ScheduledReportForm {...defaultProps} />, { wrapper });

      const toggle = await screen.findByText('Send by email');
      await user.click(toggle);

      const emailField = await screen.findByTestId('emailRecipientsCombobox');
      const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
      expect(emailInput).toBeDisabled();
      expect(emailField).toHaveTextContent('test@example.com');
      expect(screen.queryByTestId('showCcBccButton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('emailCcRecipientsCombobox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('emailBccRecipientsCombobox')).not.toBeInTheDocument();
      expect(screen.getByText('Sensitive information')).toBeInTheDocument();
    });
  });

  it('shows cc and bcc fields if they have a value', async () => {
    user = userEvent.setup({ delay: null });
    render(
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
      />,
      { wrapper }
    );

    // Wait for email fields to be rendered
    await screen.findByTestId('emailRecipientsCombobox');
    expect(screen.getByTestId('emailCcRecipientsCombobox')).toBeInTheDocument();
    expect(screen.getByTestId('emailBccRecipientsCombobox')).toBeInTheDocument();
  });

  it("hides cc and bcc fields if they don't have a value", async () => {
    user = userEvent.setup({ delay: null });
    render(
      <ScheduledReportForm
        {...defaultProps}
        editMode
        scheduledReport={{
          ...defaultProps.scheduledReport,
          sendByEmail: true,
          emailRecipients: ['to@email.com'],
        }}
      />,
      { wrapper }
    );

    // Wait for email fields to be rendered
    await screen.findByTestId('emailRecipientsCombobox');
    expect(screen.queryByTestId('emailCcRecipientsCombobox')).not.toBeInTheDocument();
    expect(screen.queryByTestId('emailBccRecipientsCombobox')).not.toBeInTheDocument();
  });

  describe('when in edit mode', () => {
    it('disables report type', async () => {
      render(<ScheduledReportForm {...defaultProps} editMode />, { wrapper });

      expect(await screen.findByTestId('reportTypeIdSelect')).toBeDisabled();
    });

    it('calls onSubmit correctly', async () => {
      user = userEvent.setup({ delay: null });
      render(
        <ScheduledReportForm
          {...defaultProps}
          editMode
          availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
        />,
        { wrapper }
      );

      const titleInput = await screen.findByTestId('reportTitleInput');
      await user.clear(titleInput);
      await user.paste('Updated scheduled report title');

      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');

      await user.click(submitButton);

      await waitFor(() => {
        expect(onSubmitForm).toHaveBeenCalledWith(
          {
            recurringSchedule: {
              frequency: 2,
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

  describe('when in readonly mode', () => {
    it('disables title', async () => {
      render(<ScheduledReportForm {...defaultProps} readOnly />, { wrapper });

      expect(await screen.findByTestId('reportTitleInput')).toHaveAttribute('readonly');
    });

    it('disables report type', async () => {
      render(<ScheduledReportForm {...defaultProps} readOnly />, { wrapper });

      expect(await screen.findByTestId('reportTypeIdSelect')).toBeDisabled();
    });

    it('disables date picker', async () => {
      render(<ScheduledReportForm {...defaultProps} readOnly />, { wrapper });

      expect(await screen.findByTestId('startDatePicker-input')).toHaveAttribute('readonly');
    });

    it('disables schedule', async () => {
      render(<ScheduledReportForm {...defaultProps} readOnly />, { wrapper });

      expect(await screen.findByTestId('recurringScheduleRepeatSelect')).toBeDisabled();
    });

    it('disables all email fields', async () => {
      render(
        <ScheduledReportForm
          {...defaultProps}
          readOnly
          scheduledReport={{
            ...defaultProps.scheduledReport,
            sendByEmail: true,
            emailRecipients: ['to@email.com'],
            emailCcRecipients: ['cc@email.com'],
            emailBccRecipients: ['bccemail.com'],
          }}
        />,
        { wrapper }
      );

      expect(await screen.findByTestId('sendByEmailToggle')).toBeDisabled();
      expect(screen.getByTestId('emailRecipientsCombobox')).toHaveAttribute('readonly');
      expect(screen.getByTestId('emailCcRecipientsCombobox')).toHaveAttribute('readonly');
      expect(screen.getByTestId('emailBccRecipientsCombobox')).toHaveAttribute('readonly');
      expect(screen.getByTestId('emailSubjectInput')).toHaveAttribute('disabled');
      expect(screen.getByTestId('emailMessageTextArea')).toHaveAttribute('disabled');
    });

    it('disables submit button', async () => {
      render(<ScheduledReportForm {...defaultProps} readOnly />, { wrapper });

      expect(await screen.findByTestId('scheduleExportSubmitButton')).toBeDisabled();
    });
  });

  describe('validation', () => {
    it('shows validation error when title is empty', async () => {
      user = userEvent.setup({ delay: null });
      render(<ScheduledReportForm {...defaultProps} />, { wrapper });

      const titleInput = await screen.findByTestId('reportTitleInput');
      await user.clear(titleInput);

      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');
      await user.click(submitButton);

      expect(onSubmitForm).not.toHaveBeenCalled();

      expect(await screen.findByText('Report file name is required')).toBeInTheDocument();
    });

    it('does not throw error for previous start date when it is not updated in edit mode', async () => {
      user = userEvent.setup();
      render(
        <ScheduledReportForm
          {...defaultProps}
          editMode
          availableReportTypes={[{ id: 'printablePdfV2', label: 'PDF' }]}
        />,
        { wrapper }
      );

      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');
      await user.click(submitButton);

      expect(onSubmitForm).toHaveBeenCalled();
    });
  });
});
