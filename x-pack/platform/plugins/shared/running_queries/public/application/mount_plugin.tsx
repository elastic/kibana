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
import { RunningQueriesAppContextProvider } from './app_context';
import { RunningQueriesApp } from './app';

export const renderApp = (coreStart: CoreStart, params: ManagementAppMountParams) => {
  ReactDOM.render(
    coreStart.rendering.addContext(
      <RunningQueriesAppContextProvider
        chrome={coreStart.chrome}
        notifications={coreStart.notifications}
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
