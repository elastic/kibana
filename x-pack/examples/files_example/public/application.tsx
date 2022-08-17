/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { AppPluginStartDependencies } from './types';
import { FilesExampleApp } from './components/app';

const queryClient = new QueryClient();

export const renderApp = (
  { notifications, http }: CoreStart,
  { files }: AppPluginStartDependencies,
  { element, appBasePath }: AppMountParameters
) => {
  ReactDOM.render(
    <QueryClientProvider client={queryClient}>
      <FilesExampleApp
        basename={appBasePath}
        files={files}
        notifications={notifications}
        http={http}
      />
    </QueryClientProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
