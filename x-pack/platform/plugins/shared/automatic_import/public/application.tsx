/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { Observable } from 'rxjs';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { IntegrationManagement } from './components/integration_management/integration_management';
import type { RenderUpselling, Services } from './services/types';
import type { AutomaticImportTelemetryService } from './services/telemetry';
import type { AutomaticImportPluginStartDependencies } from './types';
import { UIStateProvider } from './components/integration_management/contexts';
import { TelemetryContextProvider } from './components/telemetry_context';
import { AvailabilityWrapper } from './common/components/availability_wrapper/availability_wrapper';

const queryClient = new QueryClient();

export const renderApp = ({
  coreStart,
  plugins,
  params,
  telemetryService,
  renderUpselling$,
}: {
  coreStart: CoreStart;
  plugins: AutomaticImportPluginStartDependencies;
  params: AppMountParameters;
  telemetryService: AutomaticImportTelemetryService;
  renderUpselling$: Observable<RenderUpselling | undefined>;
}) => {
  const { element, history } = params;
  const services: Services = {
    ...coreStart,
    ...plugins,
    telemetry: telemetryService,
    renderUpselling$,
  };

  ReactDOM.render(
    coreStart.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={services}>
          <TelemetryContextProvider>
            <UIStateProvider>
              <AvailabilityWrapper>
                <Router history={history}>
                  <Routes>
                    <Route path="/edit/:integrationId" component={IntegrationManagement} />
                    <Route path="/" component={IntegrationManagement} />
                  </Routes>
                </Router>
              </AvailabilityWrapper>
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
