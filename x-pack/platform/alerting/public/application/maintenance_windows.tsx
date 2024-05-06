/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { CoreStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider, KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { EuiLoadingSpinner } from '@elastic/eui';
import { AlertingPluginStart } from '../plugin';
import { MAINTENANCE_WINDOW_PATHS } from '../../common';
import { useLicense } from '../hooks/use_license';

const MaintenanceWindowsLazy: React.FC = React.lazy(() => import('../pages/maintenance_windows'));
const MaintenanceWindowsCreateLazy: React.FC = React.lazy(
  () => import('../pages/maintenance_windows/maintenance_window_create_page')
);
const MaintenanceWindowsEditLazy: React.FC = React.lazy(
  () => import('../pages/maintenance_windows/maintenance_window_edit_page')
);

const App = React.memo(() => {
  const { isAtLeastPlatinum } = useLicense();
  const hasLicense = isAtLeastPlatinum();

  return (
    <Routes>
      {hasLicense ? (
        <Route
          key={MAINTENANCE_WINDOW_PATHS.alerting.maintenanceWindowsCreate}
          path={MAINTENANCE_WINDOW_PATHS.alerting.maintenanceWindowsCreate}
          exact
        >
          <Suspense fallback={<EuiLoadingSpinner />}>
            <MaintenanceWindowsCreateLazy />
          </Suspense>
        </Route>
      ) : null}
      {hasLicense ? (
        <Route
          key={MAINTENANCE_WINDOW_PATHS.alerting.maintenanceWindowsEdit}
          path={MAINTENANCE_WINDOW_PATHS.alerting.maintenanceWindowsEdit}
          exact
        >
          <Suspense fallback={<EuiLoadingSpinner />}>
            <MaintenanceWindowsEditLazy />
          </Suspense>
        </Route>
      ) : null}
      <Route>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <MaintenanceWindowsLazy />
        </Suspense>
      </Route>
    </Routes>
  );
});
App.displayName = 'App';

export const renderApp = ({
  core,
  plugins,
  mountParams,
  kibanaVersion,
}: {
  core: CoreStart;
  plugins: AlertingPluginStart;
  mountParams: ManagementAppMountParams;
  kibanaVersion: string;
}) => {
  const { element, history, theme$ } = mountParams;
  const i18nCore = core.i18n;
  const isDarkMode = core.theme.getTheme().darkMode;

  const queryClient = new QueryClient();

  ReactDOM.render(
    <KibanaThemeProvider theme$={theme$}>
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          storage: new Storage(localStorage),
          kibanaVersion,
        }}
      >
        <Router history={history}>
          <EuiThemeProvider darkMode={isDarkMode}>
            <i18nCore.Context>
              <QueryClientProvider client={queryClient}>
                <App />
              </QueryClientProvider>
            </i18nCore.Context>
          </EuiThemeProvider>
        </Router>
      </KibanaContextProvider>
    </KibanaThemeProvider>,
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
