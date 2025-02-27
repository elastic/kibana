/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

import { API_BASE_PATH } from '../../common';
import { AuthorizationProvider } from '../shared_imports';
import { AppContextProvider, AppDependencies } from './app_context';

interface Props {
  appDependencies: AppDependencies;
  children: React.ReactNode;
}

export const AppProviders = ({ appDependencies, children }: Props) => {
  const { core } = appDependencies;
  const { http, ...startServices } = core;

  return (
    <KibanaRenderContextProvider {...startServices}>
      <AuthorizationProvider httpClient={http} privilegesEndpoint={`${API_BASE_PATH}privileges`}>
        <AppContextProvider value={appDependencies}>{children}</AppContextProvider>
      </AuthorizationProvider>
    </KibanaRenderContextProvider>
  );
};
