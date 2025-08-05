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
import { ReportExportsTable } from './report_exports_table';
import { render, screen, waitFor } from '@testing-library/react';
import { Job, ReportingAPIClient } from '@kbn/reporting-public';
import { Observable } from 'rxjs';
import { ILicense } from '@kbn/licensing-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { userEvent } from '@testing-library/user-event';
import { mockConfig } from '../__test__/report_listing.test.helpers';
import React from 'react';
import { REPORT_TABLE_ID, REPORT_TABLE_ROW_ID } from '@kbn/reporting-common';
import { mockJobs } from '../../../common/test';
import { RecursivePartial, UseEuiTheme } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';

jest.mock('./report_info_flyout', () => ({
  ReportInfoFlyout: () => <div data-test-subj="reportInfoFlyout" />,
}));

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

describe('ReportExportsTable', () => {
  const mockTheme = getMockTheme({ euiTheme: { size: { s: '' } } });
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(reportingAPIClient, 'list')
      .mockImplementation(() => Promise.resolve(mockJobs.map((j) => new Job(j))));
    jest.spyOn(reportingAPIClient, 'total').mockImplementation(() => Promise.resolve(18));
    window.open = jest.fn();
    window.focus = jest.fn();
  });

  it('renders table correctly', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <ReportExportsTable {...defaultProps} />
      </ThemeProvider>
    );

    expect(await screen.findByTestId(REPORT_TABLE_ID)).toBeInTheDocument();
  });

  it('renders empty state correctly', async () => {
    jest.spyOn(reportingAPIClient, 'list').mockImplementation(() => Promise.resolve([]));
    jest.spyOn(reportingAPIClient, 'total').mockImplementation(() => Promise.resolve(0));
    render(
      <ThemeProvider theme={mockTheme}>
        <ReportExportsTable {...defaultProps} />
      </ThemeProvider>
    );

    expect(await screen.findByText('No reports have been created')).toBeInTheDocument();
  });

  it('renders data correctly', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <ReportExportsTable {...defaultProps} />
      </ThemeProvider>
    );

    expect(await screen.findAllByTestId(REPORT_TABLE_ROW_ID)).toHaveLength(mockJobs.length);

    expect(await screen.findByTestId(`viewReportingLink-${mockJobs[0].id}`)).toBeInTheDocument();
    expect(await screen.findByTestId(`reportDownloadLink-${mockJobs[0].id}`)).toBeInTheDocument();
  });

  it('should show config flyout from table action', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <ReportExportsTable {...defaultProps} />
      </ThemeProvider>
    );

    userEvent.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstReportViewConfig = await screen.findByTestId(`viewReportingLink-${mockJobs[0].id}`);

    expect(firstReportViewConfig).toBeInTheDocument();

    userEvent.click(firstReportViewConfig, { pointerEventsCheck: 0 });

    expect(await screen.findByTestId('reportInfoFlyout')).toBeInTheDocument();
  });

  it('should show config flyout from title click', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <ReportExportsTable {...defaultProps} />
      </ThemeProvider>
    );

    const reportViewConfig = await screen.findByTestId(`viewReportingLink-${mockJobs[1].id}`);

    expect(reportViewConfig).toBeInTheDocument();

    userEvent.click(reportViewConfig, { pointerEventsCheck: 0 });

    expect(await screen.findByTestId('reportInfoFlyout')).toBeInTheDocument();
  });

  it('should open dashboard', async () => {
    render(
      <ThemeProvider theme={mockTheme}>
        <ReportExportsTable {...defaultProps} />
      </ThemeProvider>
    );

    userEvent.click((await screen.findAllByTestId('euiCollapsedItemActionsButton'))[0]);

    const firstOpenDashboard = await screen.findByTestId('reportOpenInKibanaApp');

    expect(firstOpenDashboard).toBeInTheDocument();

    userEvent.click(firstOpenDashboard, { pointerEventsCheck: 0 });

    await waitFor(() => {
      expect(window.open).toHaveBeenCalledWith(
        '/s/my-space/app/reportingRedirect?jobId=k90e51pk1ieucbae0c3t8wo2',
        '_blank'
      );
    });
  });
});
