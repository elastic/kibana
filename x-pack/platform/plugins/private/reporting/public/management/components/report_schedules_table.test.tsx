/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  applicationServiceMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { render, screen, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/reporting-public';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { RecursivePartial, UseEuiTheme } from '@elastic/eui';
import ReportSchedulesTable from './report_schedules_table';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { mockScheduledReports } from '../../../common/test/fixtures';
import { bulkDisableScheduledReports } from '../apis/bulk_disable_scheduled_reports';
import { bulkDeleteScheduledReports } from '../apis/bulk_delete_scheduled_reports';
import { getScheduledReportsList } from '../apis/get_scheduled_reports_list';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { useGetUserProfileQuery } from '../hooks/use_get_user_profile_query';
import { bulkEnableScheduledReports } from '../apis/bulk_enable_scheduled_reports';

jest.mock('@kbn/reporting-public', () => ({
  useKibana: jest.fn(),
  ReportingAPIClient: jest.fn().mockImplementation(() => ({
    getScheduledList: jest.fn(),
    disableScheduledReports: jest.fn(),
  })),
}));

jest.mock('./view_scheduled_report_flyout', () => ({
  ViewScheduledReportFlyout: () => <div data-test-subj="viewScheduledReportFlyout" />,
}));
jest.mock('./edit_scheduled_report_flyout', () => ({
  EditScheduledReportFlyout: () => <div data-test-subj="editScheduledReportFlyout" />,
}));

jest.mock('../apis/get_scheduled_reports_list');
jest.mock('../apis/bulk_disable_scheduled_reports');
jest.mock('../apis/bulk_delete_scheduled_reports');
jest.mock('../hooks/use_get_user_profile_query');
jest.mock('../apis/bulk_enable_scheduled_reports');

const mockGetScheduledReports = jest.mocked(getScheduledReportsList);
const mockDisableScheduledReports = jest.mocked(bulkDisableScheduledReports);
const mockDeleteScheduledReports = jest.mocked(bulkDeleteScheduledReports);
const mockGetUserProfileQuery = jest.mocked(useGetUserProfileQuery);
const mockEnableScheduledReports = jest.mocked(bulkEnableScheduledReports);

const http = httpServiceMock.createSetupContract();
const application = applicationServiceMock.createStartContract();

export const getMockTheme = (partialTheme: RecursivePartial<UseEuiTheme>): UseEuiTheme =>
  partialTheme as UseEuiTheme;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});
const mockValidateEmailAddresses = jest.fn().mockReturnValue([]);

describe('ReportSchedulesTable', () => {
  // Disabling delay to avoid issues with fake timers
  // See https://github.com/testing-library/user-event/issues/833
  const user = userEvent.setup({ delay: null, pointerEventsCheck: 0 });

  const mockKibanaServices = (manageReporting: boolean) => ({
    application: {
      capabilities: { ...application.capabilities, manageReporting: { show: manageReporting } },
    },
    http,
    notifications: notificationServiceMock.createStartContract(),
    userProfile: userProfileServiceMock.createStart(),
    actions: {
      validateEmailAddresses: mockValidateEmailAddresses,
    },
  });

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
      services: mockKibanaServices(false),
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
    mockGetScheduledReports.mockResolvedValue({
      page: 3,
      size: 10,
      total: 3,
      data: mockScheduledReports,
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
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByTestId('reportSchedulesTable')).toBeInTheDocument();
    expect(screen.getByTestId('scheduledReportsSearchField')).toBeInTheDocument();
    expect(screen.getByTestId('refreshScheduledReportsButton')).toBeInTheDocument();
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
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findByText('No reports have been created')).toBeInTheDocument();
  });

  it('renders data correctly', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);
    expect(await screen.findByText(mockScheduledReports[0].title)).toBeInTheDocument();
    expect(await screen.findAllByText('Active')).toHaveLength(2);
    expect(await screen.findAllByText('Disabled')).toHaveLength(1);
  });

  it('shows view schedule config', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    expect(
      await screen.findByTestId(`reportViewConfig-${mockScheduledReports[0].id}`)
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId(`reportEditConfig-${mockScheduledReports[0].id}`)
    ).not.toBeInTheDocument();
  });

  it('should show config flyout from table action', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    const firstReportViewConfig = await screen.findByTestId(
      `reportViewConfig-${mockScheduledReports[0].id}`
    );

    expect(firstReportViewConfig).toBeInTheDocument();

    await user.click(firstReportViewConfig);

    expect(await screen.findByTestId('viewScheduledReportFlyout')).toBeInTheDocument();
  });

  it('should show config flyout from title click', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    await user.click((await screen.findAllByTestId('reportTitle'))[0]);

    expect(await screen.findByTestId('viewScheduledReportFlyout')).toBeInTheDocument();
  });

  it('should open dashboard', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    const firstOpenDashboard = await screen.findByTestId(
      `reportOpenDashboard-${mockScheduledReports[0].id}`
    );

    expect(firstOpenDashboard).toBeInTheDocument();

    await user.click(firstOpenDashboard);

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        '/app/reportingRedirect?page=1&perPage=50&scheduledReportId=scheduled-report-1&search=',
        '_blank'
      );
    });
  });

  it('should search schedules with the provided search text on enter', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    const searchField = screen.getByTestId(`scheduledReportsSearchField`);
    await user.type(searchField, 'Report{enter}');

    expect(mockGetScheduledReports).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: 'Report',
      })
    );
  });

  it('should reset the search param when clearing the search field', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

    const searchField = screen.getByTestId(`scheduledReportsSearchField`);
    await user.type(searchField, 'Report{enter}');

    await user.click(screen.getByTestId(`clearSearchButton`));

    expect(mockGetScheduledReports).toHaveBeenLastCalledWith(
      expect.objectContaining({
        search: '',
      })
    );
  });

  it('should force refetch schedules when pressing refresh', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ReportSchedulesTable />
        </QueryClientProvider>
      </IntlProvider>
    );

    expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);
    expect(mockGetScheduledReports).toHaveBeenCalledTimes(1);

    const refreshButton = screen.getByTestId(`refreshScheduledReportsButton`);
    await user.click(refreshButton);

    expect(mockGetScheduledReports).toHaveBeenCalledTimes(2);
    expect(mockGetScheduledReports).toHaveBeenLastCalledWith(
      ...mockGetScheduledReports.mock.calls[0]
    );
  });

  describe('when user is author of reports', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      window.open = jest.fn();
      window.focus = jest.fn();
      (useKibana as jest.Mock).mockReturnValue({
        services: mockKibanaServices(false),
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
      mockGetScheduledReports.mockResolvedValue({
        page: 1,
        size: 10,
        total: 1,
        data: [{ ...mockScheduledReports[0], created_by: 'testuser' }],
      });
      queryClient.clear();
    });

    it('should show edit action correctly', async () => {
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(1);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      expect(
        await screen.findByTestId(`reportEditConfig-${mockScheduledReports[0].id}`)
      ).toBeInTheDocument();
    });

    it('should show disable action correctly ', async () => {
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(1);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      expect(
        await screen.findByTestId(`reportDisableSchedule-${mockScheduledReports[0].id}`)
      ).toBeInTheDocument();
    });

    it('should show delete action correctly ', async () => {
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(1);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      expect(
        await screen.findByTestId(`reportDeleteSchedule-${mockScheduledReports[0].id}`)
      ).toBeInTheDocument();
    });

    it('should show enable action correctly', async () => {
      mockGetScheduledReports.mockResolvedValue({
        page: 1,
        size: 10,
        total: 1,
        data: [{ ...mockScheduledReports[0], created_by: 'testuser', enabled: false }],
      });

      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(1);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      expect(
        await screen.findByTestId(`reportEnableSchedule-${mockScheduledReports[0].id}`)
      ).toBeInTheDocument();
    });
  });

  describe('when user is reporting manager', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      window.open = jest.fn();
      window.focus = jest.fn();
      (useKibana as jest.Mock).mockReturnValue({
        services: mockKibanaServices(true),
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
      mockGetScheduledReports.mockResolvedValue({
        page: 3,
        size: 10,
        total: 3,
        data: mockScheduledReports,
      });
      queryClient.clear();
    });

    it('shows disable confirmation modal correctly', async () => {
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
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
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
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

    it('shows enable action correctly', async () => {
      mockGetScheduledReports.mockResolvedValue({
        page: 1,
        size: 10,
        total: 1,
        data: [{ ...mockScheduledReports[0], enabled: false }],
      });
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(1);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      expect(
        await screen.findByTestId(`reportEnableSchedule-${mockScheduledReports[0].id}`)
      ).toBeInTheDocument();
    });

    it('disable schedule report correctly', async () => {
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
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

    it('enable schedule report correctly', async () => {
      mockGetScheduledReports.mockResolvedValue({
        page: 1,
        size: 10,
        total: 1,
        data: [{ ...mockScheduledReports[0], enabled: false }],
      });
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(1);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      const firstReportEnable = await screen.findByTestId(
        `reportEnableSchedule-${mockScheduledReports[0].id}`
      );

      expect(firstReportEnable).toBeInTheDocument();

      await user.click(firstReportEnable);

      await waitFor(() => {
        expect(mockEnableScheduledReports).toHaveBeenCalledWith(
          expect.objectContaining({
            ids: [mockScheduledReports[0].id],
          })
        );
      });
    });

    it('delete schedule report correctly', async () => {
      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
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

    it('shows edit schedule config', async () => {
      (useKibana as jest.Mock).mockReturnValue({
        services: mockKibanaServices(true),
      });

      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      await waitForEuiPopoverOpen();

      expect(
        await screen.findByTestId(`reportEditConfig-${mockScheduledReports[0].id}`)
      ).toHaveTextContent('Edit schedule config');
      expect(screen.queryByText('View schedule config')).not.toBeInTheDocument();
    });

    it('should show edit flyout correctly', async () => {
      (useKibana as jest.Mock).mockReturnValue({
        services: mockKibanaServices(true),
      });

      render(
        <IntlProvider locale="en">
          <QueryClientProvider client={queryClient}>
            <ReportSchedulesTable />
          </QueryClientProvider>
        </IntlProvider>
      );

      expect(await screen.findAllByTestId('scheduledReportRow')).toHaveLength(3);

      await user.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

      await waitForEuiPopoverOpen();

      const firstReportEdit = await screen.findByTestId(
        `reportEditConfig-${mockScheduledReports[0].id}`
      );
      expect(firstReportEdit).toBeInTheDocument();

      await user.click(firstReportEdit);
      expect(await screen.findByTestId('editScheduledReportFlyout')).toBeInTheDocument();
    });
  });
});
