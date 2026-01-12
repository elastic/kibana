/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';

import { EuiLoadingSpinner } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MAINTENANCE_WINDOW_PATHS } from '../common';
import { useLicense } from './hooks/use_license';
import type { MaintenanceWindowsPublicStartDependencies } from './types';

const MaintenanceWindowsLazy: React.FC = React.lazy(() => import('./components/home'));
const MaintenanceWindowsCreateLazy: React.FC = React.lazy(() => import('./components/create_page'));
const MaintenanceWindowsEditLazy: React.FC = React.lazy(() => import('./components/edit_page'));

const App = React.memo(() => {
  const { isAtLeastPlatinum } = useLicense();
  const hasLicense = isAtLeastPlatinum();

  return (
    <Routes>
      {hasLicense ? (
        <Route
          key={MAINTENANCE_WINDOW_PATHS.maintenanceWindowsCreate}
          path={MAINTENANCE_WINDOW_PATHS.maintenanceWindowsCreate}
          exact
        >
          <Suspense fallback={<EuiLoadingSpinner />}>
            <MaintenanceWindowsCreateLazy />
          </Suspense>
        </Route>
      ) : null}
      {hasLicense ? (
        <Route
          key={MAINTENANCE_WINDOW_PATHS.maintenanceWindowsEdit}
          path={MAINTENANCE_WINDOW_PATHS.maintenanceWindowsEdit}
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
  plugins: MaintenanceWindowsPublicStartDependencies;
  mountParams: ManagementAppMountParams;
  kibanaVersion: string;
}) => {
  const { element, history } = mountParams;

  const queryClient = new QueryClient();

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider
        services={{
          ...core,
          ...plugins,
          storage: new Storage(localStorage),
          kibanaVersion,
        }}
      >
        <Router history={history}>
          <QueryClientProvider client={queryClient}>
            <App />
          </QueryClientProvider>
        </Router>
      </KibanaContextProvider>
    ),
    element
  );
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
