/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NotificationsSetup } from '@kbn/core/public';
import {
  applicationServiceMock,
  coreMock,
  httpServiceMock,
  notificationServiceMock,
} from '@kbn/core/public/mocks';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ILicense } from '@kbn/licensing-types';
import type { ClientConfigType } from '@kbn/reporting-public';
import { InternalApiClientProvider, Job, ReportingAPIClient } from '@kbn/reporting-public';
import type { LocatorPublic, SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { registerTestBed } from '@kbn/test-jest-helpers';
import type { SerializableRecord } from '@kbn/utility-types';
import React from 'react';
import { act } from 'react-dom/test-utils';
import type { Observable } from 'rxjs';
import { EuiThemeProvider } from '@elastic/eui';

import type { RouteComponentProps } from 'react-router-dom';
import { createLocation, createMemoryHistory } from 'history';
import type { ListingProps as Props } from '..';
import { ReportingTabs } from '..';
import { mockJobs } from '../../../common/test';
import { IlmPolicyStatusContextProvider } from '../../lib/ilm_policy_status_context';
import { ReportDiagnostic } from '../components';
import type { MatchParams } from '../components/reporting_tabs';

export interface TestDependencies {
  http: ReturnType<typeof httpServiceMock.createSetupContract>;
  application: ReturnType<typeof applicationServiceMock.createStartContract>;
  reportingAPIClient: ReportingAPIClient;
  license$: Observable<ILicense>;
  urlService: SharePluginSetup['url'];
  toasts: NotificationsSetup['toasts'];
  ilmLocator: LocatorPublic<SerializableRecord>;
  uiSettings: ReturnType<typeof coreMock.createSetup>['uiSettings'];
  reportDiagnostic: typeof ReportDiagnostic;
  data: DataPublicPluginStart;
  share: SharePluginStart;
}

export const mockConfig: ClientConfigType = {
  csv: {
    scroll: {
      duration: '10m',
      size: 500,
    },
    maxRows: 10000,
  },
  poll: {
    jobsRefresh: {
      interval: 5000,
      intervalErrorMultiplier: 3,
    },
  },
  export_types: {
    pdf: {
      enabled: true,
    },
    png: {
      enabled: true,
    },
    csv: {
      enabled: true,
    },
  },
  statefulSettings: { enabled: true },
};

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

export const createTestBed = registerTestBed(
  ({
    http,
    application,
    reportingAPIClient,
    license$: l$,
    urlService,
    toasts,
    uiSettings,
    data,
    share,
    ...rest
  }: Partial<Props> & TestDependencies) => (
    <EuiThemeProvider>
      <KibanaContextProvider services={{ http, application, uiSettings, data, share }}>
        <InternalApiClientProvider apiClient={reportingAPIClient} http={http}>
          <IlmPolicyStatusContextProvider>
            <ReportingTabs
              config={mockConfig}
              apiClient={reportingAPIClient}
              {...routeProps}
              {...rest}
            />
          </IlmPolicyStatusContextProvider>
        </InternalApiClientProvider>
      </KibanaContextProvider>
    </EuiThemeProvider>
  ),
  { memoryRouter: { wrapComponent: false } }
);

export type TestBed = Awaited<ReturnType<typeof setup>>;

export const setup = async (props?: Partial<Props>) => {
  const uiSettingsClient = coreMock.createSetup().uiSettings;
  const httpService = httpServiceMock.createSetupContract();
  const reportingAPIClient = new ReportingAPIClient(httpService, uiSettingsClient, 'x.x.x');

  jest
    .spyOn(reportingAPIClient, 'list')
    .mockImplementation(() => Promise.resolve(mockJobs.map((j) => new Job(j))));
  jest.spyOn(reportingAPIClient, 'total').mockImplementation(() => Promise.resolve(18));
  jest.spyOn(reportingAPIClient, 'migrateReportingIndicesIlmPolicy').mockImplementation(jest.fn());

  const ilmLocator: LocatorPublic<SerializableRecord> = {
    getUrl: jest.fn(),
  } as unknown as LocatorPublic<SerializableRecord>;

  const reportDiagnostic = () => (
    <ReportDiagnostic apiClient={reportingAPIClient} clientConfig={mockConfig} />
  );

  const testDependencies: TestDependencies = {
    http: httpService,
    application: applicationServiceMock.createStartContract(),
    toasts: notificationServiceMock.createSetupContract().toasts,
    license$,
    reportingAPIClient,
    ilmLocator,
    uiSettings: uiSettingsClient,
    urlService: {
      locators: {
        get: () => ilmLocator,
      },
    } as unknown as SharePluginSetup['url'],
    reportDiagnostic,
    data: dataPluginMock.createStartContract(),
    share: sharePluginMock.createStartContract(),
  };

  const testBed = createTestBed({ ...testDependencies, ...props });

  const { find, exists, component } = testBed;

  const api = {
    ...testBed,
    testDependencies,
    actions: {
      findListTable: () => find('reportJobListing'),
      hasIlmMigrationBanner: () => exists('migrateReportingIndicesPolicyCallOut'),
      hasIlmPolicyLink: () => exists('ilmPolicyLink'),
      flyout: {
        open: async (jobId: string) => {
          await act(async () => {
            find(`viewReportingLink-${jobId}`).simulate('click');
          });
          component.update();
        },
        openActionsMenu: () => {
          act(() => {
            find('reportInfoFlyoutActionsButton').simulate('click');
          });
          component.update();
        },
        findDownloadButton: () => find('reportInfoFlyoutDownloadButton'),
        findOpenInAppButton: () => find('reportInfoFlyoutOpenInKibanaButton'),
      },
      migrateIndices: async () => {
        await act(async () => {
          find('migrateReportingIndicesButton').simulate('click');
        });
        component.update();
      },
      hasScreenshotDiagnosticLink: () => exists('screenshotDiagnosticLink'),
    },
  };

  return api;
};
