/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { PLUGIN_NAME } from '../constants';
import { TaskManagerUiApi } from '../lib/api';
import { TaskManagerUiAppContextProvider } from './app_context';
import { TaskManagerApp } from './app';

export const renderApp = (
  coreStart: CoreStart,
  data: DataPublicPluginStart,
  { element, history, setBreadcrumbs }: ManagementAppMountParams
) => {
  setBreadcrumbs([{ text: PLUGIN_NAME }]);
  coreStart.chrome.docTitle.change(PLUGIN_NAME);

  const queryClient = new QueryClient();
  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <TaskManagerUiAppContextProvider
          api={new TaskManagerUiApi(coreStart.http)}
          uiSettings={coreStart.uiSettings}
          notifications={coreStart.notifications}
          data={data}
        >
          <Router history={history}>
            <TaskManagerApp />
          </Router>
        </TaskManagerUiAppContextProvider>
      </QueryClientProvider>
    )
  );

  return () => {
    coreStart.chrome.docTitle.reset();
    root.unmount();
  };
};
