/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, createContext } from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { HomePublicPluginSetup } from '../../../../../../src/plugins/home/public';
import {
  CoreStart,
  LegacyCoreStart,
  Plugin,
  CoreSetup,
  PluginInitializerContext
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
import { getRoutes } from '../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { MatchedRouteProvider } from '../context/MatchedRouteContext';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { setHelpExtension } from './setHelpExtension';
import { setReadonlyBadge } from './updateBadge';
import { featureCatalogueEntry } from './featureCatalogueEntry';
import { getConfigFromInjectedMetadata } from './getConfigFromInjectedMetadata';
import { toggleAppLinkInNav } from './toggleAppLinkInNav';
import { BreadcrumbRoute } from '../components/app/Main/ProvideBreadcrumbs';
import { stackVersionFromLegacyMetadata } from './stackVersionFromLegacyMetadata';

export const REACT_APP_ROOT_ID = 'react-apm-root';

const MainContainer = styled.main`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
  height: 100%;
`;

const App = ({ routes }: { routes: BreadcrumbRoute[] }) => {
  return (
    <MainContainer data-test-subj="apmMainContainer">
      <UpdateBreadcrumbs routes={routes} />
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

export interface ApmPluginSetupDeps {
  home: HomePublicPluginSetup;
}

export interface ApmPluginStartDeps {
  data: DataPublicPluginStart;
}

export interface ConfigSchema {
  indexPatternTitle: string;
  serviceMapEnabled: boolean;
  ui: {
    enabled: boolean;
  };
}

// These are to be used until we switch over all our context handling to
// kibana_react
export const PluginsContext = createContext<
  ApmPluginStartDeps & { apm: { config: ConfigSchema; stackVersion: string } }
>(
  {} as ApmPluginStartDeps & {
    apm: { config: ConfigSchema; stackVersion: string };
  }
);
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
  constructor(
    // @ts-ignore Not using initializerContext now, but will be once NP
    // migration is complete.
    private readonly initializerContext: PluginInitializerContext<ConfigSchema>
  ) {}

  // Take the DOM element as the constructor, so we can mount the app.
  public setup(_core: CoreSetup, plugins: ApmPluginSetupDeps) {
    plugins.home.featureCatalogue.register(featureCatalogueEntry);
  }

  public start(core: CoreStart, plugins: ApmPluginStartDeps) {
    const i18nCore = core.i18n;

    // Once we're actually an NP plugin we'll get the config from the
    // initializerContext like:
    //
    //     const config = this.initializerContext.config.get<ConfigSchema>();
    //
    // Until then we use a shim to get it from legacy injectedMetadata:
    const config = getConfigFromInjectedMetadata();

    // Once we're actually an NP plugin we'll get the package info from the
    // initializerContext like:
    //
    //     const stackVersion = this.initializerContext.env.packageInfo.branch
    //
    // Until then we use a shim to get it from legacy metadata:
    const stackVersion = stackVersionFromLegacyMetadata;

    const pluginsForContext = { ...plugins, apm: { config, stackVersion } };

    const routes = getRoutes(config);

    // render APM feedback link in global help menu
    setHelpExtension(core);
    setReadonlyBadge(core);
    toggleAppLinkInNav(core, config);

    ReactDOM.render(
      <KibanaCoreContextProvider core={core as LegacyCoreStart}>
        <PluginsContext.Provider value={pluginsForContext}>
          <i18nCore.Context>
            <Router history={history}>
              <LocationProvider>
                <MatchedRouteProvider routes={routes}>
                  <UrlParamsProvider>
                    <LoadingIndicatorProvider>
                      <LicenseProvider>
                        <App routes={routes} />
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
