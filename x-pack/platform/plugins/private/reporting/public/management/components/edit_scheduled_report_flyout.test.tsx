/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, waitFor } from '@testing-library/react';
import {
  applicationServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { useKibana } from '@kbn/reporting-public';
import { mockScheduledReports } from '../../../common/test/fixtures';

import { EditScheduledReportFlyout } from './edit_scheduled_report_flyout';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import userEvent from '@testing-library/user-event';
import { getReportingHealth } from '../apis/get_reporting_health';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import moment from 'moment';
import { updateScheduleReport } from '../apis/update_schedule_report';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
  ReportingAPIClient: jest.fn(),
}));

jest.mock('../hooks/use_get_user_profile_query');
jest.mock('../apis/get_reporting_health');
jest.mock('../apis/update_schedule_report');

const mockValidateEmailAddresses = jest.fn().mockResolvedValue([]);
const mockReportingHealth = jest.mocked(getReportingHealth);
const mockGetUserPRofileQuery = jest.mocked(useGetUserProfileQuery);
const mockedUseUiSetting = jest.mocked(useUiSetting);
const mockUpdateScheduleReport = jest.mocked(updateScheduleReport);

describe('EditScheduledReportFlyout', () => {
  const onClose = jest.fn();
  const application = applicationServiceMock.createStartContract();
  const http = httpServiceMock.createSetupContract();
  const queryClient = new QueryClient();
  let user: ReturnType<typeof userEvent.setup>;
  const today = new Date('2025-11-10T12:00:00.000Z');

  const defaultProps = {
    scheduledReport: mockScheduledReports[1],
    availableReportTypes: [],
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

    mockGetUserPRofileQuery.mockReturnValue({
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
    mockUpdateScheduleReport.mockResolvedValue({
      job: {
        id: mockScheduledReports[1].id,
      } as any,
    });

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
          <EditScheduledReportFlyout {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('editScheduledReportFlyout')).toBeInTheDocument();
    expect(await screen.findByTestId('scheduleExportForm')).toBeInTheDocument();
    expect(await screen.findByTestId('scheduleExportSubmitButton')).toBeInTheDocument();
  });

  it('submits the form correctly', async () => {
    user = userEvent.setup();
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <EditScheduledReportFlyout
            {...defaultProps}
            availableReportTypes={[{ label: 'PDF', id: 'printablePdfV2' }]}
          />
        </QueryClientProvider>
      </IntlProvider>
    );

    const titleInput = await screen.findByTestId('reportTitleInput');
    await user.clear(titleInput);
    await user.paste('Updated scheduled report title');

    const submitButton = await screen.findByTestId('scheduleExportSubmitButton');

    await user.click(submitButton);
    await waitFor(() => {
      expect(mockUpdateScheduleReport).toHaveBeenCalledWith(
        expect.objectContaining({
          http,
          params: {
            reportId: mockScheduledReports[1].id,
            schedule: {
              rrule: {
                byhour: [12],
                byminute: [0],
                byweekday: ['MO'],
                freq: 3,
                interval: 1,
                dtstart: '2025-11-10T12:00:00.000Z',
                tzid: 'UTC',
              },
            },
            title: 'Updated scheduled report title',
          },
        })
      );
    });
  });
});
