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
import type { InboxActionDetailRendererLoader, InboxStartDependencies } from './types';
import { InboxActionsPage } from './pages/inbox_actions';
import { InboxDetailRendererProvider } from './hooks/use_action_detail_renderer';

interface RenderAppParams {
  coreStart: CoreStart;
  startDeps: InboxStartDependencies;
  params: AppMountParameters;
  detailRenderers: Map<string, InboxActionDetailRendererLoader>;
}

const rootStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
};

export const renderApp = ({ coreStart, startDeps, params, detailRenderers }: RenderAppParams) => {
  coreStart.chrome.docTitle.change(PLUGIN_NAME);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Action state is driven by external writers (Workflows, other
        // providers), so we bias toward freshness over cache stickiness:
        //   - `staleTime: 30s` dedupes rapid-fire reads within a single
        //     render pass but still lets the 'always' triggers below win.
        //   - `refetchOnWindowFocus: 'always'` forces a refetch every time
        //     the tab regains focus, even if the query is within staleTime.
        //   - `refetchOnMount: 'always'` does the same when the user
        //     navigates back to /app/inbox.
        // Together these keep the list reliably current without the user
        // having to hit a refresh button.
        staleTime: 30_000,
        refetchOnWindowFocus: 'always',
        refetchOnMount: 'always',
      },
    },
  });

  const App = () => (
    <div style={rootStyle}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
            <InboxDetailRendererProvider renderers={detailRenderers}>
              <Router history={params.history}>
                <Routes>
                  <Route path="/" component={InboxActionsPage} />
                </Routes>
              </Router>
            </InboxDetailRendererProvider>
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
