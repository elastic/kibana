/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter, Switch } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { EuiErrorBoundary } from '@elastic/eui';
import euiLight from '@elastic/eui/dist/eui_theme_light.json';
import { ChromeStart, CoreSetup, HttpStart, I18nStart, NotificationsStart } from 'src/core/public';
import { CoreProvider } from './contexts/core';
import { setClient } from './data';
import { PackageInstallProvider } from './hooks/';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginInitializerContext {}

export type PluginSetup = ReturnType<Plugin['setup']>;
export type PluginStart = ReturnType<Plugin['start']>;

export interface PluginTheme {
  eui: typeof euiLight;
}

export interface PluginCore {
  chrome: ChromeStart;
  http: HttpStart;
  i18n: I18nStart;
  routes: JSX.Element[];
  theme: PluginTheme;
  renderTo: HTMLElement;
  notifications: NotificationsStart;
}

export class Plugin {
  constructor(initializerContext: PluginInitializerContext) {}
  // called when plugin is setting up during Kibana's startup sequence
  public setup(core: CoreSetup) {
    setClient(core.http.fetch);
  }
  // called after all plugins are set up
  public start(core: PluginCore) {
    ReactDOM.render(<App core={core} />, core.renderTo);
  }
}

function App(props: { core: PluginCore }) {
  const { i18n, routes, notifications } = props.core;
  return (
    <EuiErrorBoundary>
      <CoreProvider core={props.core}>
        <i18n.Context>
          <ThemeProvider theme={props.core.theme}>
            <PackageInstallProvider notifications={notifications}>
              <HashRouter>
                <Switch>{routes}</Switch>
              </HashRouter>
            </PackageInstallProvider>
          </ThemeProvider>
        </i18n.Context>
      </CoreProvider>
    </EuiErrorBoundary>
  );
}
