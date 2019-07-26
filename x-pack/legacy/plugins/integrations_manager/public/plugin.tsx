/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter, Switch } from 'react-router-dom';
import { ChromeStart, CoreSetup, I18nStart } from 'src/core/public';
import { CoreProvider } from './contexts/core';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginInitializerContext {}

export type PluginSetup = ReturnType<Plugin['setup']>;
export type PluginStart = ReturnType<Plugin['start']>;

export interface PluginCore {
  i18n: I18nStart;
  chrome: ChromeStart;
  routes: JSX.Element[];
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

function Root(props: { core: PluginCore }) {
  const { i18n, routes } = props.core;

  return (
    <CoreProvider core={props.core}>
      <i18n.Context>
        <HashRouter>
          <Switch>{routes}</Switch>
        </HashRouter>
      </i18n.Context>
    </CoreProvider>
  );
}
