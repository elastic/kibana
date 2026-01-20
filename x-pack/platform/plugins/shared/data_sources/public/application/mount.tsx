/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { DataSourcesRoutes } from './routes';
import type { DataSourcesPluginStart, DataSourcesPluginStartDependencies } from '../types';

export interface DataSourcesMountParams {
  core: CoreStart;
  plugins: DataSourcesPluginStartDependencies;
  services: DataSourcesPluginStart;
  params: AppMountParameters;
}

export const renderApp = ({ core, plugins, services, params }: DataSourcesMountParams) => {
  const kibanaServices = { ...core, plugins, services, appParams: { history: params.history } };
  const { element } = params;
  const queryClient = new QueryClient();

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={kibanaServices}>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <Router history={params.history}>
              <DataSourcesRoutes />
            </Router>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    ),
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
