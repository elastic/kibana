/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom';

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { ClientConfigType } from '@kbn/reporting-public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import {
  InternalApiClientProvider,
  ReportingAPIClient,
  KibanaContext,
} from '@kbn/reporting-public';
import { ReportListing } from '.';
import { PolicyStatusContextProvider } from '../lib/default_status_context';
import {
  APP_PATH,
  HOME_PATH,
  REPORTING_EXPORTS_PATH,
  REPORTING_SCHEDULES_PATH,
  SCHEDULES_TAB_ID,
  Section,
} from '../constants';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiPage } from '@elastic/eui';
import { suspendedComponentWithProps } from '../suspended_component_with_props';
import { Redirect, match } from 'react-router';
import { MatchParams } from './components/reporting_tabs';

const ReportingTabs = lazy(() => import('./components/reporting_tabs'));

export async function mountManagementSection(
  coreStart: CoreStart,
  license$: LicensingPluginStart['license$'],
  dataService: DataPublicPluginStart,
  shareService: SharePluginStart,
  config: ClientConfigType,
  apiClient: ReportingAPIClient,
  params: ManagementAppMountParams
) {
  const services: KibanaContext = {
    http: coreStart.http,
    application: coreStart.application,
    uiSettings: coreStart.uiSettings,
    docLinks: coreStart.docLinks,
    data: dataService,
    share: shareService,
    chrome: coreStart.chrome,
  };
  const sections: Section[] = ['exports', 'schedules'];
  const { element, history } = params;

  const sectionsRegex = sections.join('|');

  ReactDOM.render(
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={services}>
        <InternalApiClientProvider apiClient={apiClient} http={coreStart.http}>
          <PolicyStatusContextProvider config={config}>
            <Router history={history}>
              <Routes>
                <Route
                  path={`/:section(${sectionsRegex})`}
                  render={(routerProps) => {
                    console.log('Redirecting to Reporting Home', {
                      routerProps: params,
                      history,
                      coreStart,
                      config,
                      apiClient,
                      license$,
                    });
                    return (
                      <Suspense fallback={<EuiLoadingSpinner size="xl" />}>
                        <ReportingTabs
                          coreStart={coreStart}
                          apiClient={apiClient}
                          license$={license$}
                          config={config}
                          dataService={dataService}
                          shareService={shareService}
                          {...routerProps}
                        />
                      </Suspense>
                    );
                  }}
                />
                <Redirect from={'/'} to="/exports" />
              </Routes>
            </Router>
          </PolicyStatusContextProvider>
        </InternalApiClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
}
