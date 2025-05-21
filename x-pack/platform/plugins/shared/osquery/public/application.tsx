/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router } from '@kbn/shared-ux-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { AppPluginStartDependencies } from './types';
import { OsqueryApp } from './components/app';
import { PLUGIN_NAME } from '../common';
import { KibanaContextProvider } from './common/lib/kibana';
import { queryClient } from './query_client';
import { KibanaRenderContextProvider } from './shared_imports';

export const renderApp = (
  core: CoreStart,
  services: AppPluginStartDependencies,
  { element, history }: AppMountParameters,
  storage: Storage,
  kibanaVersion: string
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider
        // eslint-disable-next-line react-perf/jsx-no-new-object-as-prop
        services={{
          appName: PLUGIN_NAME,
          kibanaVersion,
          ...core,
          ...services,
          storage,
        }}
      >
        <Router history={history}>
          <QueryClientProvider client={queryClient}>
            <OsqueryApp />
            <ReactQueryDevtools initialIsOpen={false} />
          </QueryClientProvider>
        </Router>
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
