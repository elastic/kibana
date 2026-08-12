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
import type { ChatOpener, ContextEngineStartDependencies } from '../types';
import type { ContextEngineSearchNavigationAdapter } from '../search_navigation_adapter';
import type { ContextEngineServices } from './hooks/use_kibana';
import { ContextEngineRoutes } from './routes';

const queryClient = new QueryClient({
  // Keep signal groups / group signals fresh for 30s so they don't refetch on every remount or
  // window refocus.
  defaultOptions: { queries: { staleTime: 30_000 } },
});

export const mountApp = ({
  core,
  plugins,
  element,
  history,
  getChatOpener,
  searchNavigation,
}: {
  core: CoreStart;
  plugins: ContextEngineStartDependencies;
  element: HTMLElement;
  history: ScopedHistory;
  getChatOpener?: () => ChatOpener | undefined;
  searchNavigation?: ContextEngineSearchNavigationAdapter;
}) => {
  const services: ContextEngineServices = {
    ...core,
    data: plugins.data,
    share: plugins.share,
    triggersActionsUi: plugins.triggersActionsUi,
    console: plugins.console,
    spaces: plugins.spaces,
    getChatOpener,
    searchNavigation,
    history,
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
