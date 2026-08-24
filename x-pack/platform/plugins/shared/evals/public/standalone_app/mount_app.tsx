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
import { wrapWithTheme } from '@kbn/react-kibana-context-theme';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { PLUGIN_ID, PLUGIN_NAME } from '../../common';
import type { EvalsStartDependencies } from '../types';
import { EvalsApp } from '../application';

interface MountAppParams {
  coreStart: CoreStart;
  startDeps: EvalsStartDependencies;
  element: HTMLElement;
  history: AppMountParameters['history'];
}

export const mountStandaloneApp = async ({
  coreStart,
  startDeps,
  element,
  history,
}: MountAppParams) => {
  coreStart.chrome.docTitle.change(PLUGIN_NAME);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
      },
    },
  });

  const setBreadcrumbs = coreStart.chrome.setBreadcrumbs.bind(coreStart.chrome);
  const getHref = (path: string) =>
    coreStart.application.getUrlForApp(PLUGIN_ID, { path, absolute: false });

  const App = () => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <KibanaContextProvider services={{ ...coreStart, ...startDeps }}>
          <EvalsApp history={history} setBreadcrumbs={setBreadcrumbs} getHref={getHref} />
        </KibanaContextProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  ReactDOM.render(wrapWithTheme(<App />, coreStart.theme), element);

  return () => {
    ReactDOM.unmountComponentAtNode(element);
  };
};
