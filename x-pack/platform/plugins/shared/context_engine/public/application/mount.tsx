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
import type {
  ChatOpener,
  ContextEnginePluginStart,
  ContextEngineStartDependencies,
} from '../types';
import type { ContextEngineServices } from './hooks/use_kibana';
import { resolveAgentBuilderStart } from './resolve_agent_builder';
import { ContextEngineRoutes } from './routes';

const queryClient = new QueryClient({
  // Keep signal groups / group signals fresh for 30s so they don't refetch on every remount or
  // window refocus.
  defaultOptions: { queries: { staleTime: 30_000 } },
});

export const mountApp = async ({
  core,
  plugins,
  coreSetup,
  element,
  history,
  getChatOpener,
}: {
  core: CoreStart;
  plugins: ContextEngineStartDependencies;
  coreSetup: CoreSetup<ContextEngineStartDependencies, ContextEnginePluginStart>;
  element: HTMLElement;
  history: ScopedHistory;
  getChatOpener?: () => ChatOpener | undefined;
}) => {
  const agentBuilder = await resolveAgentBuilderStart(coreSetup);

  const services: ContextEngineServices = {
    ...core,
    agentBuilder,
    data: plugins.data,
    share: plugins.share,
    triggersActionsUi: plugins.triggersActionsUi,
    console: plugins.console,
    spaces: plugins.spaces,
    getChatOpener,
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
