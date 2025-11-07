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
import { Router } from '@kbn/shared-ux-router';
import { I18nProvider } from '@kbn/i18n-react';
import { DataConnectorsRoutes } from './routes';
import type { DataConnectorsPluginStart, DataConnectorsPluginStartDependencies } from '../types';

export interface DataConnectorsMountParams {
  core: CoreStart;
  plugins: DataConnectorsPluginStartDependencies;
  services: DataConnectorsPluginStart;
  params: AppMountParameters;
}

export const renderApp = ({ core, plugins, services, params }: DataConnectorsMountParams) => {
  const kibanaServices = { ...core, plugins, services, appParams: { history: params.history } };
  const { element } = params;
  ReactDOM.render(
    <KibanaContextProvider services={kibanaServices}>
      <I18nProvider>
        <Router history={params.history}>
          <DataConnectorsRoutes />
        </Router>
      </I18nProvider>
    </KibanaContextProvider>,
    element
  );
  return () => ReactDOM.unmountComponentAtNode(element);
};
