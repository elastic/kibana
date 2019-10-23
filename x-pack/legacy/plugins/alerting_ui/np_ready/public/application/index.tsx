/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { HashRouter } from 'react-router-dom';
import { render } from 'react-dom';
import { CoreStart } from 'src/core/public';
import { App } from './app';

import { AppDependencies, AppPlugins } from '../../../public/shim';
import { ActionTypeRegistry } from './action_type_registry';
import { AlertTypeRegistry } from './alert_type_registry';

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
    <I18nContext>
      <HashRouter>
        <AppDependenciesProvider value={deps}>{children}</AppDependenciesProvider>
      </HashRouter>
    </I18nContext>
  );
};

export const renderReact = async (
  elem: HTMLElement | null,
  core: CoreStart,
  plugins: AppPlugins,
  actionTypeRegistry: ActionTypeRegistry,
  alertTypeRegistry: AlertTypeRegistry
) => {
  const Providers = getAppProviders({ core, plugins, actionTypeRegistry, alertTypeRegistry });

  render(
    <Providers>
      <App />
    </Providers>,
    elem
  );
};
