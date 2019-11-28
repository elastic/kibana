/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext } from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';
import {
  CoreStart,
  LegacyCoreStart,
  Plugin,
  CoreSetup
} from '../../../../../../src/core/public';
import { DataPublicPluginStart } from '../../../../../../src/plugins/data/public';
import { KibanaCoreContextProvider } from '../../../observability/public';
import { history } from '../utils/history';
import { LocationProvider } from '../context/LocationContext';
import { UrlParamsProvider } from '../context/UrlParamsContext';
import { px, unit, units } from '../style/variables';
import { LoadingIndicatorProvider } from '../context/LoadingIndicatorContext';
import { LicenseProvider } from '../context/LicenseContext';
import { UpdateBreadcrumbs } from '../components/app/Main/UpdateBreadcrumbs';
import { routes } from '../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { MatchedRouteProvider } from '../context/MatchedRouteContext';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { setHelpExtension } from './setHelpExtension';
import { setReadonlyBadge } from './updateBadge';

export const REACT_APP_ROOT_ID = 'react-apm-root';

const MainContainer = styled.main`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
`;

const App = () => {
  return (
    <MainContainer data-test-subj="apmMainContainer">
      <UpdateBreadcrumbs />
      <Route component={ScrollToTopOnPathChange} />
      <Switch>
        {routes.map((route, i) => (
          <Route key={i} {...route} />
        ))}
      </Switch>
    </MainContainer>
  );
};

export type ApmPluginSetup = void;
export type ApmPluginStart = void;
export type ApmPluginSetupDeps = {}; // eslint-disable-line @typescript-eslint/consistent-type-definitions

export interface ApmPluginStartDeps {
  data: DataPublicPluginStart;
}

const PluginsContext = createContext({} as ApmPluginStartDeps);

export function usePlugins() {
  return useContext(PluginsContext);
}

export class ApmPlugin
  implements
    Plugin<
      ApmPluginSetup,
      ApmPluginStart,
      ApmPluginSetupDeps,
      ApmPluginStartDeps
    > {
  // Take the DOM element as the constructor, so we can mount the app.
  public setup(_core: CoreSetup, _plugins: ApmPluginSetupDeps) {}

  public start(core: CoreStart, plugins: ApmPluginStartDeps) {
    const i18nCore = core.i18n;

    // render APM feedback link in global help menu
    setHelpExtension(core);
    setReadonlyBadge(core);

    ReactDOM.render(
      <KibanaCoreContextProvider core={core as LegacyCoreStart}>
        <PluginsContext.Provider value={plugins}>
          <i18nCore.Context>
            <Router history={history}>
              <LocationProvider>
                <MatchedRouteProvider>
                  <UrlParamsProvider>
                    <LoadingIndicatorProvider>
                      <LicenseProvider>
                        <App />
                      </LicenseProvider>
                    </LoadingIndicatorProvider>
                  </UrlParamsProvider>
                </MatchedRouteProvider>
              </LocationProvider>
            </Router>
          </i18nCore.Context>
        </PluginsContext.Provider>
      </KibanaCoreContextProvider>,
      document.getElementById(REACT_APP_ROOT_ID)
    );

    // create static index pattern and store as saved object. Not needed by APM UI but for legacy reasons in Discover, Dashboard etc.
    createStaticIndexPattern(core.http).catch(e => {
      // eslint-disable-next-line no-console
      console.log('Error fetching static index pattern', e);
    });
  }

  public stop() {}
}
