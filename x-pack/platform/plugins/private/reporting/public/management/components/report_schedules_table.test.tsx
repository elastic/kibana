/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applicationServiceMock,
  coreMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import { ReportingAPIClient, useKibana } from '@kbn/reporting-public';
import type { Observable } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';
import type { SharePluginSetup } from '@kbn/share-plugin/public';
import userEvent from '@testing-library/user-event';
import { mockConfig } from '../__test__/report_listing.test.helpers';
import React from 'react';
import type { RecursivePartial, UseEuiTheme } from '@elastic/eui';
import ReportSchedulesTable from './report_schedules_table';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { mockScheduledReports } from '../../../common/test/fixtures';
import { bulkDisableScheduledReports } from '../apis/bulk_disable_scheduled_reports';
import { bulkDeleteScheduledReports } from '../apis/bulk_delete_scheduled_reports';
import { getScheduledReportsList } from '../apis/get_scheduled_reports_list';

jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
  ReportingAPIClient: jest.fn().mockImplementation(() => ({
    getScheduledList: jest.fn(),
    disableScheduledReports: jest.fn(),
  })),
}));

jest.mock('./scheduled_report_flyout', () => ({
  ScheduledReportFlyout: () => <div data-test-subj="scheduledReportFlyout" />,
}));

jest.mock('../apis/get_scheduled_reports_list');
jest.mock('../apis/bulk_disable_scheduled_reports');
jest.mock('../apis/bulk_delete_scheduled_reports');

const mockGetScheduledReports = jest.mocked(getScheduledReportsList);
const mockDisableScheduledReports = jest.mocked(bulkDisableScheduledReports);
const mockDeleteScheduledReports = jest.mocked(bulkDeleteScheduledReports);

const coreStart = coreMock.createStart();
const http = httpServiceMock.createSetupContract();
const uiSettingsClient = coreMock.createSetup().uiSettings;
const httpService = httpServiceMock.createSetupContract();
const application = applicationServiceMock.createStartContract();
const reportingAPIClient = new ReportingAPIClient(httpService, uiSettingsClient, 'x.x.x');
const validCheck = {
  check: () => ({
    state: 'VALID',
    message: '',
  }),
};
const license$ = {
  subscribe: (handler: unknown) => {
    return (handler as Function)(validCheck);
  },
} as Observable<ILicense>;

export const getMockTheme = (partialTheme: RecursivePartial<UseEuiTheme>): UseEuiTheme =>
  partialTheme as UseEuiTheme;

const defaultProps = {
  coreStart,
  http,
  application,
  apiClient: reportingAPIClient,
  config: mockConfig,
  license$,
  urlService: {} as unknown as SharePluginSetup['url'],
  toasts: notificationServiceMock.createSetupContract().toasts,
  capabilities: application.capabilities,
  redirect: application.navigateToApp,
  navigateToUrl: application.navigateToUrl,
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const mockValidateEmailAddresses = jest.fn().mockResolvedValue([]);

describe('ReportSchedulesTable', () => {
  // Disabling delay to avoid issues with fake timers
  // See https://github.com/testing-library/user-event/issues/833
  const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.open = jest.fn();
    window.focus = jest.fn();
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        ...coreStart,
        actions: {
          validateEmailAddresses: mockValidateEmailAddresses,
        },
      },
    });
    queryClient.clear();
  });

  it('renders table correctly', async () => {
    mockGetScheduledReports.mockResolvedValueOnce({
      page: 0,
      size: 10,
      total: 0,
      data: [],
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('reportSchedulesTable')).toBeInTheDocument();
  });

  it('renders empty state correctly', async () => {
    mockGetScheduledReports.mockResolvedValueOnce({
      page: 0,
      size: 10,
      total: 0,
      data: [],
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('No reports have been created')).toBeInTheDocument();
  });

  it('renders data correctly', async () => {
    mockGetScheduledReports.mockResolvedValueOnce({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);
    expect(await screen.findByText(mockScheduledReports[0].title)).toBeInTheDocument();
    expect(await screen.findAllByText('Active')).toHaveLength(2);
    expect(await screen.findAllByText('Disabled')).toHaveLength(1);
  });

  it('shows disable confirmation modal correctly', async () => {
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstReportDisable = await screen.findByTestId(
      `reportDisableSchedule-${mockScheduledReports[0].id}`
    );

    expect(firstReportDisable).toBeInTheDocument();

    await user.click(firstReportDisable);

    expect(await screen.findByTestId('confirm-destructive-action-modal')).toBeInTheDocument();
  });

  it('shows delete confirmation modal correctly', async () => {
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstReportDelete = await screen.findByTestId(
      `reportDeleteSchedule-${mockScheduledReports[0].id}`
    );

    expect(firstReportDelete).toBeInTheDocument();

    await user.click(firstReportDelete);

    expect(await screen.findByTestId('confirm-destructive-action-modal')).toBeInTheDocument();
  });

  it('disable schedule report correctly', async () => {
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstReportDisable = await screen.findByTestId(
      `reportDisableSchedule-${mockScheduledReports[0].id}`
    );

    expect(firstReportDisable).toBeInTheDocument();

    await user.click(firstReportDisable);

    expect(await screen.findByTestId('confirm-destructive-action-modal')).toBeInTheDocument();

    await user.click(await screen.findByText('Disable'));

    await waitFor(() => {
      expect(mockDisableScheduledReports).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [mockScheduledReports[0].id],
        })
      );
    });
  });

  it('delete schedule report correctly', async () => {
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstReportDelete = await screen.findByTestId(
      `reportDeleteSchedule-${mockScheduledReports[0].id}`
    );

    expect(firstReportDelete).toBeInTheDocument();

    await user.click(firstReportDelete);

    expect(await screen.findByTestId('confirm-destructive-action-modal')).toBeInTheDocument();

    await user.click(await screen.findByText('Delete'));

    await waitFor(() => {
      expect(mockDeleteScheduledReports).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [mockScheduledReports[0].id],
        })
      );
    });
  });

  it('should show config flyout from table action', async () => {
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstReportViewConfig = await screen.findByTestId(
      `reportViewConfig-${mockScheduledReports[0].id}`
    );

    expect(firstReportViewConfig).toBeInTheDocument();

    await user.click(firstReportViewConfig);

    expect(await screen.findByTestId('scheduledReportFlyout')).toBeInTheDocument();
  });

  it('should show config flyout from title click', async () => {
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('reportTitle'))[0]);

    expect(await screen.findByTestId('scheduledReportFlyout')).toBeInTheDocument();
  });

  it('should open dashboard', async () => {
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
    });

    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable {...defaultProps} />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstOpenDashboard = await screen.findByTestId(
      `reportOpenDashboard-${mockScheduledReports[0].id}`
    );

    expect(firstOpenDashboard).toBeInTheDocument();

    await user.click(firstOpenDashboard);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        '/app/reportingRedirect?page=1&perPage=50&scheduledReportId=scheduled-report-1',
        '_blank'
      );
    });
  });
});
