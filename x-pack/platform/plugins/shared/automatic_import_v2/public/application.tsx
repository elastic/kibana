/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { IntegrationManagement } from './components/integration_management/integration_management';
import type { Services } from './services/types';
import type { AIV2TelemetryService } from './services/telemetry';
import type { AutomaticImportPluginStartDependencies } from './types';
import { UIStateProvider } from './components/integration_management/contexts';
import { TelemetryContextProvider } from './components/telemetry_context';

const queryClient = new QueryClient();

export const renderApp = ({
  coreStart,
  plugins,
  params,
  telemetryService,
}: {
  coreStart: CoreStart;
  plugins: AutomaticImportPluginStartDependencies;
  params: AppMountParameters;
  telemetryService: AIV2TelemetryService;
}) => {
  const { element, history } = params;
  const services: Services = {
    ...coreStart,
    ...plugins,
    telemetry: telemetryService,
  };

  ReactDOM.render(
    coreStart.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={services}>
          <TelemetryContextProvider>
            <UIStateProvider>
              <Router history={history}>
                <Routes>
                  <Route path="/edit/:integrationId" component={IntegrationManagement} />
                  <Route path="/" component={IntegrationManagement} />
                </Routes>
              </Router>
            </UIStateProvider>
          </TelemetryContextProvider>
        </KibanaContextProvider>
      </QueryClientProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
