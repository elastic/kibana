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
import { IntegrationManagement } from './components/integration_management/integration_management';
import { TelemetryContextProvider } from './components/integration_management/telemetry';
import type { Services } from './services/types';
import type { TelemetryService } from './services/telemetry/service';
import type { AutomaticImportPluginStartDependencies } from './types';

export const renderApp = ({
  coreStart,
  plugins,
  params,
  telemetry,
}: {
  coreStart: CoreStart;
  plugins: AutomaticImportPluginStartDependencies;
  params: AppMountParameters;
  telemetry: TelemetryService;
}) => {
  const { element } = params;
  const services: Services = {
    ...coreStart,
    ...plugins,
    telemetry,
  };

  ReactDOM.render(
    coreStart.rendering.addContext(
      <KibanaContextProvider services={services}>
        <TelemetryContextProvider>
          <IntegrationManagement />
        </TelemetryContextProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
