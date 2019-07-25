/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { ChromeStart, CoreSetup, I18nStart } from 'src/core/public';
import { HashRouter, Switch } from 'react-router-dom';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginInitializerContext {}

export type PluginSetup = ReturnType<Plugin['setup']>;
export type PluginStart = ReturnType<Plugin['start']>;

export interface PluginCore {
  i18n: I18nStart;
  chrome: ChromeStart;
  routes: JSX.Element[];
}
export interface PluginDependencies {
  core: PluginCore;
  plugins?: [];
}

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}
  // called when plugin is setting up during Kibana's startup sequence
  public setup(core: CoreSetup) {}
  // called after all plugins are set up
  public start(core: PluginCore) {
    return {
      root: <Root core={core} />,
    };
  }
}

export function usePluginDependencies() {
  if (!DependenciesContext) {
    throw new Error(`No plugin dependencies Context. Call the "setPluginDependencies()" method`);
  }
  return useContext<PluginDependencies>(DependenciesContext);
}

function Root(props: { core: PluginCore }) {
  const { routes } = props.core;
  const Providers = getPluginProviders({ core: props.core });

  return (
    <Providers>
      <HashRouter>
        <Switch>{routes}</Switch>
      </HashRouter>
    </Providers>
  );
}

let DependenciesContext: React.Context<PluginDependencies>;
function setPluginDependencies(deps: PluginDependencies) {
  DependenciesContext = createContext<PluginDependencies>(deps);
  return DependenciesContext.Provider;
}

function getPluginProviders(deps: PluginDependencies) {
  const { i18n } = deps.core;
  const PluginDependenciesProvider = setPluginDependencies(deps);

  return ({ children }: { children: ReactNode }) => (
    <i18n.Context>
      <PluginDependenciesProvider value={deps}>{children}</PluginDependenciesProvider>
    </i18n.Context>
  );
}
