/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { RunningQueriesStartDependencies } from '../types';
import { RunningQueriesAppContextProvider } from './app_context';
import { RunningQueriesApp } from './app';
import { RunningQueriesApiService } from '../lib/api';

export const renderApp = (
  coreStart: CoreStart,
  pluginsStart: RunningQueriesStartDependencies,
  params: ManagementAppMountParams
) => {
  const apiService = new RunningQueriesApiService(coreStart.http);

  ReactDOM.render(
    coreStart.rendering.addContext(
      <RunningQueriesAppContextProvider
        chrome={coreStart.chrome}
        http={coreStart.http}
        notifications={coreStart.notifications}
        apiService={apiService}
        url={pluginsStart.share.url}
        kibanaCapabilities={coreStart.application.capabilities}
      >
        <RunningQueriesApp />
      </RunningQueriesAppContextProvider>
    ),
    params.element
  );

  return () => {
    ReactDOM.unmountComponentAtNode(params.element);
  };
};
