/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, waitFor, within } from '@testing-library/react';
import {
  applicationServiceMock,
  coreMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import { mockScheduledReports } from '../../../common/test/fixtures';

import { CreateScheduledReportForm } from './create_scheduled_report_form';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import userEvent from '@testing-library/user-event';
import { getReportingHealth } from '../apis/get_reporting_health';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { scheduleReport } from '../apis/schedule_report';
import moment from 'moment';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { transformScheduledReport } from '../utils';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
  ReportingAPIClient: jest.fn().mockImplementation(() => ({
    getDecoratedJobParams: jest.fn().mockResolvedValue({
      browserTimezone: 'UTC',
      version: 'x.x.x',
      title: 'Scheduled report 2',
      objectType: 'dashboard',
    }),
  })),
}));

jest.mock('../hooks/use_get_user_profile_query');
jest.mock('../apis/get_reporting_health');
jest.mock('../apis/schedule_report');

const mockValidateEmailAddresses = jest.fn().mockReturnValue([]);
const mockReportingHealth = jest.mocked(getReportingHealth);
const mockGetUserProfileQuery = jest.mocked(useGetUserProfileQuery);
const mockedUseUiSetting = jest.mocked(useUiSetting);
const mockScheduleReport = jest.mocked(scheduleReport);

describe('createScheduledReportForm', () => {
  const onClose = jest.fn();
  const application = applicationServiceMock.createStartContract();
  const http = httpServiceMock.createSetupContract();
  const uiSettings = coreMock.createSetup().uiSettings;
  const apiClient = new ReportingAPIClient(http, uiSettings, 'x.x.x');
  const queryClient = new QueryClient();
  let user: ReturnType<typeof userEvent.setup>;
  const today = new Date('2025-11-10T12:00:00.000Z');

  const defaultSharingData = {
    title: 'canvas',
    locatorParams: {
      id: 'canvas-123',
      params: {
        id: '123',
      },
    },
  };

  const defaultProps = {
    apiClient,
    scheduledReport: transformScheduledReport(mockScheduledReports[1]),
    availableReportTypes: [],
    sharingData: defaultSharingData,
    objectType: 'dashboard',
    onClose,
  };

  beforeAll(() => {
    moment.tz.setDefault('UTC');
    mockedUseUiSetting.mockReturnValue('UTC');
  });

  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: {
          capabilities: { ...application.capabilities, manageReporting: { show: true } },
        },
        http,
        notifications: notificationServiceMock.createStartContract(),
        userProfile: userProfileServiceMock.createStart(),
        actions: {
          validateEmailAddresses: mockValidateEmailAddresses,
        },
      },
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
    mockScheduleReport.mockResolvedValue({
      job: {
        id: mockScheduledReports[1].id,
      },
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
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <CreateScheduledReportForm {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('scheduleExportForm')).toBeInTheDocument();
    expect(await screen.findByTestId('scheduleExportSubmitButton')).toBeInTheDocument();
  });

  it('submits the form correctly', async () => {
    user = userEvent.setup({ delay: null });
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <CreateScheduledReportForm
            {...defaultProps}
            availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    const submitButton = await screen.findByTestId('scheduleExportSubmitButton');

    await user.click(submitButton);
    await waitFor(() => {
      expect(mockScheduleReport).toHaveBeenCalledWith(
        expect.objectContaining({
          http,
          params: {
            reportTypeId: 'printablePdfV2',
            schedule: {
              rrule: {
                byhour: [12],
                byminute: [0],
                freq: 3,
                interval: 1,
                dtstart: '2025-11-10T12:00:00.000Z',
                tzid: 'UTC',
              },
            },
            jobParams: expect.any(String),
            notification: undefined,
          },
        })
      );
    });
  });

  it('cancels the form correctly', async () => {
    user = userEvent.setup({ delay: null });
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <CreateScheduledReportForm {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    const cancelButton = await screen.findByTestId('scheduleExportCancelButton');

    await user.click(cancelButton);
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('with email notification', () => {
    it('submits the form with email subject and interpolates mustache variables', async () => {
      user = userEvent.setup({ delay: null });
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <CreateScheduledReportForm
              {...defaultProps}
              availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
            />
          </QueryClientProvider>
        </IntlProvider>
      );

      // Enable email notifications
      const sendByEmailToggle = await screen.findByTestId('sendByEmailToggle');
      await user.click(sendByEmailToggle);

      // Add at least one recipient to enable form submission
      const emailField = await screen.findByTestId('emailRecipientsCombobox');
      const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
      await user.type(emailInput, 'test@test.com');
      await user.keyboard('{Enter}');

      // Find and fill the email subject field with mustache variables
      const emailSubjectInput = await screen.findByTestId('emailSubjectInput');
      // Doubling the opening curly braces to avoid interpolation by the testing framework
      const customSubject = 'Report: {{{{title}} - {{{{objectType}} - {{{{date}}';
      await user.clear(emailSubjectInput);
      await user.type(emailSubjectInput, customSubject);

      // Submit the form
      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockScheduleReport).toHaveBeenCalledWith(
          expect.objectContaining({
            http,
            params: {
              reportTypeId: 'printablePdfV2',
              schedule: {
                rrule: {
                  byhour: [12],
                  byminute: [0],
                  freq: 3,
                  interval: 1,
                  dtstart: '2025-11-10T12:00:00.000Z',
                  tzid: 'UTC',
                },
              },
              jobParams: expect.any(String),
              notification: {
                email: expect.objectContaining({
                  subject: 'Report: {{title}} - {{objectType}} - {{date}}',
                }),
              },
            },
          })
        );
      });
    }, 10000);

    it('submits the form with email message containing mustache variables', async () => {
      user = userEvent.setup({ delay: null });
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <CreateScheduledReportForm
              {...defaultProps}
              availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
            />
          </QueryClientProvider>
        </IntlProvider>
      );

      // Enable email notifications
      const sendByEmailToggle = await screen.findByTestId('sendByEmailToggle');
      await user.click(sendByEmailToggle);

      // Add at least one recipient to enable form submission
      const emailField = await screen.findByTestId('emailRecipientsCombobox');
      const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
      await user.type(emailInput, 'test@test.com');
      await user.keyboard('{Enter}');

      // Fill email subject
      const emailSubjectInput = await screen.findByTestId('emailSubjectInput');
      await user.clear(emailSubjectInput);
      await user.type(emailSubjectInput, 'Test Subject');

      // Fill email message with mustache variables
      const emailMessageTextarea = await screen.findByTestId('emailMessageTextArea');
      // Doubling the opening curly braces to avoid interpolation by the testing framework
      const customMessage =
        'Please find attached the {{{{objectType}} report titled "{{{{title}}".\n\nFilename: {{{{filename}}\nGenerated: {{{{date}}';
      await user.clear(emailMessageTextarea);
      await user.type(emailMessageTextarea, customMessage);

      // Submit the form
      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockScheduleReport).toHaveBeenCalledWith(
          expect.objectContaining({
            http,
            params: {
              reportTypeId: 'printablePdfV2',
              schedule: expect.any(Object),
              jobParams: expect.any(String),
              notification: expect.objectContaining({
                email: expect.objectContaining({
                  subject: 'Test Subject',
                  message:
                    'Please find attached the {{objectType}} report titled "{{title}}".\n\nFilename: {{filename}}\nGenerated: {{date}}',
                }),
              }),
            },
          })
        );
      });
    }, 10000);

    it('submits the form with both email subject and message containing multiple mustache variables', async () => {
      user = userEvent.setup({ delay: null });
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <CreateScheduledReportForm
              {...defaultProps}
              availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
            />
          </QueryClientProvider>
        </IntlProvider>
      );

      // Enable email notifications
      const sendByEmailToggle = await screen.findByTestId('sendByEmailToggle');
      await user.click(sendByEmailToggle);

      // Add at least one recipient to enable form submission
      const emailField = await screen.findByTestId('emailRecipientsCombobox');
      const emailInput = within(emailField).getByTestId('comboBoxSearchInput');
      await user.type(emailInput, 'test@test.com');
      await user.keyboard('{Enter}');

      // Fill email subject with mustache variables
      const emailSubjectInput = await screen.findByTestId('emailSubjectInput');
      await user.clear(emailSubjectInput);
      await user.type(emailSubjectInput, '{{{{objectType}} {{{{title}} - {{{{date}}');

      // Fill email message with mustache variables
      const emailMessageTextarea = await screen.findByTestId('emailMessageTextArea');
      await user.clear(emailMessageTextarea);
      await user.type(
        emailMessageTextarea,
        'New {{{{objectType}} report available:\n\nTitle: {{{{title}}\nFile: {{{{filename}}\nDate: {{{{date}}'
      );

      // Submit the form
      const submitButton = await screen.findByTestId('scheduleExportSubmitButton');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockScheduleReport).toHaveBeenCalledWith(
          expect.objectContaining({
            http,
            params: {
              reportTypeId: 'printablePdfV2',
              schedule: expect.any(Object),
              jobParams: expect.any(String),
              notification: expect.objectContaining({
                email: expect.objectContaining({
                  subject: '{{objectType}} {{title}} - {{date}}',
                  message:
                    'New {{objectType}} report available:\n\nTitle: {{title}}\nFile: {{filename}}\nDate: {{date}}',
                }),
              }),
            },
          })
        );
      });
    }, 10000);
  });
});
