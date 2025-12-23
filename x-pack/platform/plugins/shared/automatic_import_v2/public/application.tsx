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
import type { Services } from './services/types';
import type { AutomaticImportPluginStartDependencies } from './types';

export const renderApp = ({
  coreStart,
  plugins,
  params,
}: {
  coreStart: CoreStart;
  plugins: AutomaticImportPluginStartDependencies;
  params: AppMountParameters;
}) => {
  const { element } = params;
  const services: Services = {
    ...coreStart,
    ...plugins,
  };

  ReactDOM.render(
    coreStart.rendering.addContext(
      <KibanaContextProvider services={services}>
        <IntegrationManagement />
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
