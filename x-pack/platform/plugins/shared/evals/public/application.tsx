/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import { RunsListPage } from './pages/runs_list';
import { RunDetailPage } from './pages/run_detail';

const queryClient = new QueryClient();

const EvalsApp: React.FC<{ coreStart: CoreStart; history: AppMountParameters['history'] }> = ({
  coreStart,
  history,
}) => {
  return (
    <KibanaRenderContextProvider {...coreStart}>
      <KibanaContextProvider services={coreStart}>
        <QueryClientProvider client={queryClient}>
          <Router history={history}>
            <Routes>
              <Route exact path="/" component={RunsListPage} />
              <Route path="/runs/:runId" component={RunDetailPage} />
            </Routes>
          </Router>
        </QueryClientProvider>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>
  );
};

export const renderApp = (coreStart: CoreStart, { element, history }: AppMountParameters) => {
  ReactDOM.render(<EvalsApp coreStart={coreStart} history={history} />, element);
  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
