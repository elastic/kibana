/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { QueryActivityStartDependencies } from '../types';
import { QueryActivityAppContextProvider } from './app_context';
import { QueryActivityApp } from './app';
import { QueryActivityApiService } from '../lib/api';

export const renderApp = (
  coreStart: CoreStart,
  pluginsStart: QueryActivityStartDependencies,
  params: ManagementAppMountParams
) => {
  const apiService = new QueryActivityApiService(coreStart.http);
  const root = createRoot(params.element);

  root.render(
    coreStart.rendering.addContext(
      <QueryActivityAppContextProvider
        chrome={coreStart.chrome}
        dataViews={pluginsStart.data.dataViews}
        http={coreStart.http}
        notifications={coreStart.notifications}
        apiService={apiService}
        url={pluginsStart.share.url}
        docLinks={coreStart.docLinks}
        kibanaCapabilities={coreStart.application.capabilities}
      >
        <QueryActivityApp />
      </QueryActivityAppContextProvider>
    )
  );

  return () => {
    root.unmount();
  };
};
