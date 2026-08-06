/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, ScopedHistory } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import type {
  ContextEngineAdditionalStartServices,
  ContextEngineStartDependencies,
} from '../types';
import type { ContextEngineServices } from './hooks/use_kibana';
import { ContextEngineRoutes } from './routes';

const queryClient = new QueryClient();

export const mountApp = ({
  core,
  plugins,
  additionalServices,
  element,
  history,
}: {
  core: CoreStart;
  plugins: ContextEngineStartDependencies;
  additionalServices: ContextEngineAdditionalStartServices;
  element: HTMLElement;
  history: ScopedHistory;
}) => {
  const services: ContextEngineServices = {
    ...core,
    ...additionalServices,
    share: plugins.share,
    triggersActionsUi: plugins.triggersActionsUi,
    console: plugins.console,
  };

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <ContextEngineRoutes />
          </Router>
        </QueryClientProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
