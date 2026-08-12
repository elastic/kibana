/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, ScopedHistory } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import React from 'react';
import ReactDOM from 'react-dom';
import type { ContextEnginePluginStart, ContextEngineStartDependencies } from '../types';
import type { ContextEngineSearchNavigationAdapter } from '../search_navigation_adapter';
import type { ContextEngineServices } from './hooks/use_kibana';
import { resolveAgentBuilderStart } from './resolve_agent_builder';
import { ContextEngineRoutes } from './routes';

const queryClient = new QueryClient();

export const mountApp = async ({
  core,
  plugins,
  coreSetup,
  element,
  history,
  searchNavigation,
}: {
  core: CoreStart;
  plugins: ContextEngineStartDependencies;
  coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>;
  element: HTMLElement;
  history: ScopedHistory;
  searchNavigation?: ContextEngineSearchNavigationAdapter;
}) => {
  const agentBuilder = await resolveAgentBuilderStart(coreSetup);

  const services: ContextEngineServices = {
    ...core,
    agentBuilder,
    share: plugins.share,
    triggersActionsUi: plugins.triggersActionsUi,
    console: plugins.console,
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
