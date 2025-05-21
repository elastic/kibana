/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { HttpSetup } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { init as initHttpRequests } from './http_requests';
import { mockContextValue } from './app_context.mock';
import { AppContextProvider } from '../../../public/application/app_context';
import { setHttpClient } from '../../../public/application/lib/api';

export const WithAppDependencies =
  (Component: any, httpSetup: HttpSetup) => (props: Record<string, unknown>) => {
    setHttpClient(httpSetup);

    return (
      <KibanaContextProvider services={{ uiSettings: mockContextValue.uiSettings }}>
        <AppContextProvider value={mockContextValue}>
          <Component {...props} />
        </AppContextProvider>
      </KibanaContextProvider>
    );
  };

export const setupEnvironment = () => {
  return initHttpRequests();
};
