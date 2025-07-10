/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { RouteComponentProps } from 'react-router-dom';
import { Router } from '@kbn/shared-ux-router';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { createMemoryHistory, createLocation } from 'history';

import ReportingTabs, { MatchParams, ReportingTabsProps } from './reporting_tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  applicationServiceMock,
  coreMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import { InternalApiClientProvider, ReportingAPIClient } from '@kbn/reporting-public';
import { Observable } from 'rxjs';
import { ILicense } from '@kbn/licensing-plugin/public';
import { LocatorPublic, SharePluginSetup } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { EuiThemeProvider } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataService } from '@kbn/controls-plugin/public/services/kibana_services';
import { shareService } from '@kbn/dashboard-plugin/public/services/kibana_services';
import { IlmPolicyMigrationStatus } from '@kbn/reporting-common/types';
import { HttpSetupMock } from '@kbn/core-http-browser-mocks';

import { IlmPolicyStatusContextProvider } from '../../lib/ilm_policy_status_context';
import { mockConfig } from '../__test__/report_listing.test.helpers';
import { ReportDiagnostic } from './report_diagnostic';

jest.mock('./report_exports_table', () => {
  return () => <div data-test-subj="reportExportsTable">{'Render Report Exports Table'}</div>;
});

jest.mock('./report_schedules_table', () => {
  return () => <div data-test-subj="reportSchedulesTable">{'Render Report Schedules Table'}</div>;
});

const queryClient = new QueryClient();

describe('Reporting tabs', () => {
  const ilmLocator: LocatorPublic<SerializableRecord> = {
    getUrl: jest.fn(),
  } as unknown as LocatorPublic<SerializableRecord>;
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
  const mockUnsubscribe = jest.fn();
  // @ts-expect-error we don't need to provide all props for the test
  const license$ = {
    subscribe: (handler: unknown) => {
      (handler as Function)(validCheck);
      return { unsubscribe: mockUnsubscribe };
    },
  } as Observable<ILicense>;

  const reportDiagnostic = () => (
    <ReportDiagnostic apiClient={reportingAPIClient} clientConfig={mockConfig} />
  );

  const routeProps: RouteComponentProps<MatchParams> = {
    history: createMemoryHistory({
      initialEntries: ['/exports'],
    }),
    location: createLocation('/exports'),
    match: {
      isExact: true,
      path: `/exports`,
      url: '',
      params: {
        section: 'exports',
      },
    },
  };

  const props = {
    ...routeProps,
    coreStart: coreMock.createStart(),
    http,
    application,
    apiClient: reportingAPIClient,
    config: mockConfig,
    license$,
    urlService: {
      locators: {
        get: () => ilmLocator,
      },
    } as unknown as SharePluginSetup['url'],
    toasts: notificationServiceMock.createSetupContract().toasts,
    ilmLocator,
    uiSettings: uiSettingsClient,
    reportDiagnostic,
    dataService: dataPluginMock.createStartContract(),
    shareService: sharePluginMock.createStartContract(),
  };

  const renderComponent = (
    renderProps: Partial<RouteComponentProps> & ReportingTabsProps,
    newHttpService?: HttpSetupMock
  ) => {
    const updatedReportingAPIClient = newHttpService
      ? new ReportingAPIClient(newHttpService, uiSettingsClient, 'x.x.x')
      : reportingAPIClient;
    return (
      <EuiThemeProvider>
        <KibanaContextProvider
          services={{
            http,
            application,
            uiSettings: uiSettingsClient,
            data: dataService,
            share: {
              shareService,
              url: {
                ...sharePluginMock.createStartContract().url,
                locators: {
                  get: () => ilmLocator,
                },
              },
            },
            notifications: notificationServiceMock.createStartContract(),
          }}
        >
          <InternalApiClientProvider apiClient={updatedReportingAPIClient} http={http}>
            <IlmPolicyStatusContextProvider>
              <IntlProvider locale="en">
                <Router history={renderProps.history ?? props.history}>
                  <QueryClientProvider client={queryClient}>
                    <ReportingTabs {...renderProps} />
                  </QueryClientProvider>
                </Router>
              </IntlProvider>
            </IlmPolicyStatusContextProvider>
          </InternalApiClientProvider>
        </KibanaContextProvider>
      </EuiThemeProvider>
    );
  };

  afterEach(() => {
    jest.clearAllMocks();
    mockUnsubscribe.mockClear();
  });

  it('renders exports components', async () => {
    render(renderComponent(props));

    expect(await screen.findByTestId('reportingTabs-exports')).toBeInTheDocument();
    expect(await screen.findByTestId('reportingTabs-schedules')).toBeInTheDocument();
  });

  it('shows the correct number of tabs', async () => {
    const updatedProps: RouteComponentProps<MatchParams> = {
      history: createMemoryHistory(),
      location: createLocation('/'),
      match: {
        isExact: true,
        path: `/schedules`,
        url: '',
        params: {
          section: 'schedules',
        },
      },
    };

    render(renderComponent({ ...props, ...updatedProps }));

    expect(await screen.findAllByRole('tab')).toHaveLength(2);
  });

  describe('ILM policy', () => {
    it('shows ILM policy link correctly when config is stateful', async () => {
      const status: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValue({ status });

      application.capabilities = {
        catalogue: {},
        navLinks: {},
        management: { data: { index_lifecycle_management: true } },
      };

      const updatedShareService = {
        ...sharePluginMock.createStartContract(),
        url: {
          ...sharePluginMock.createStartContract().url,
          locators: {
            ...sharePluginMock.createStartContract().url.locators,
            id: 'ILM_LOCATOR_ID',
            get: () => ilmLocator,
          },
        },
      };

      // @ts-expect-error we don't need to provide all props for the test
      render(renderComponent({ ...props, shareService: updatedShareService }));

      expect(await screen.findByTestId('ilmPolicyLink')).toBeInTheDocument();
    });

    it('hides ILM policy link correctly for non stateful config', async () => {
      const status: IlmPolicyMigrationStatus = 'ok';
      httpService.get.mockResolvedValue({ status });

      application.capabilities = {
        catalogue: {},
        navLinks: {},
        management: { data: { index_lifecycle_management: true } },
      };

      const updatedShareService = {
        ...sharePluginMock.createStartContract(),
        url: {
          ...sharePluginMock.createStartContract().url,
          locators: {
            ...sharePluginMock.createStartContract().url.locators,
            id: 'ILM_LOCATOR_ID',
            get: () => ilmLocator,
          },
        },
      };
      const newConfig = { ...mockConfig, statefulSettings: { enabled: false } };

      // @ts-expect-error we don't need to provide all props for the test
      render(renderComponent({ ...props, shareService: updatedShareService, config: newConfig }));

      expect(screen.queryByTestId('ilmPolicyLink')).not.toBeInTheDocument();
    });
  });

  describe('Screenshotting Diagnostic', () => {
    it('shows screenshotting diagnostic link if config is stateful', async () => {
      render(renderComponent(props));

      expect(await screen.findByTestId('screenshotDiagnosticLink')).toBeInTheDocument();
    });

    it('does not show when image reporting not set in config', async () => {
      const mockNoImageConfig = {
        ...mockConfig,
        export_types: {
          csv: { enabled: true },
          pdf: { enabled: false },
          png: { enabled: false },
        },
      };

      render(
        renderComponent({
          ...props,
          config: mockNoImageConfig,
        })
      );

      expect(screen.queryByTestId('screenshotDiagnosticLink')).not.toBeInTheDocument();
    });
  });
});
