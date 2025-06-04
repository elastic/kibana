/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, ScopedHistory } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { Router } from '@kbn/shared-ux-router';
import { OnechatRoutes } from './routes';

export const renderApp = async ({
  core,
  element,
  history,
}: {
  core: CoreStart;
  element: HTMLElement;
  history: ScopedHistory;
}) => {
  const queryClient = new QueryClient();

  ReactDOM.render(
    core.rendering.addContext(
      <KibanaContextProvider>
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <Router history={history}>
              <OnechatRoutes />
            </Router>
          </QueryClientProvider>
        </I18nProvider>
      </KibanaContextProvider>
    ),
    element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
