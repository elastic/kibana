/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { render } from 'react-dom';
import { HashRouter } from 'react-router-dom';

import { API_BASE_PATH } from '../../common/constants';
import { App } from './app';
import { httpService } from './services/http';
import { AuthorizationProvider } from './lib/authorization';
import { AppCore, AppDependencies, AppPlugins } from './types';

export { BASE_PATH as CLIENT_BASE_PATH } from './constants';

/**
 * App dependencies
 */
let DependenciesContext: React.Context<AppDependencies>;

export const setAppDependencies = (deps: AppDependencies) => {
  DependenciesContext = createContext<AppDependencies>(deps);
  return DependenciesContext.Provider;
};

export const useAppDependencies = () => {
  if (!DependenciesContext) {
    throw new Error(`The app dependencies Context hasn't been set.
    Use the "setAppDependencies()" method when bootstrapping the app.`);
  }
  return useContext<AppDependencies>(DependenciesContext);
};

const getAppProviders = (deps: AppDependencies) => {
  const {
    i18n: { Context: I18nContext },
  } = deps.core;

  // Create App dependencies context and get its provider
  const AppDependenciesProvider = setAppDependencies(deps);

  return ({ children }: { children: ReactNode }) => (
    <AuthorizationProvider
      privilegesEndpoint={httpService.addBasePath(`${API_BASE_PATH}privileges`)}
    >
      <I18nContext>
        <HashRouter>
          <AppDependenciesProvider value={deps}>{children}</AppDependenciesProvider>
        </HashRouter>
      </I18nContext>
    </AuthorizationProvider>
  );
};

export const renderReact = async (elem: Element, core: AppCore, plugins: AppPlugins) => {
  const Providers = getAppProviders({ core, plugins });

  render(
    <Providers>
      <App />
    </Providers>,
    elem
  );
};
