/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { wrapWithTheme } from '@kbn/react-kibana-context-theme';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PLUGIN_NAME } from '../common';
import type { InboxStartDependencies } from './types';
import { InboxActionsPage } from './pages/inbox_actions';

interface RenderAppParams {
  coreStart: CoreStart;
  startDeps: InboxStartDependencies;
  params: AppMountParameters;
}

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

export const renderApp = ({ coreStart, startDeps, params }: RenderAppParams) => {
  coreStart.chrome.docTitle.change(PLUGIN_NAME);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  });

  const App = () => (
    <div style={rootStyle}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
            <Router history={params.history}>
              <Routes>
                <Route path="/" component={InboxActionsPage} />
              </Routes>
            </Router>
          </KibanaContextProvider>
        </I18nProvider>
      </QueryClientProvider>
    </div>
  );

  ReactDOM.render(wrapWithTheme(<App />, coreStart.theme), params.element);

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
