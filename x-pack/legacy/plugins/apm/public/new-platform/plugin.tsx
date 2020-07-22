/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApmRoute } from '@elastic/apm-rum-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import styled from 'styled-components';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
} from '../../../../../../src/core/public';
import { DataPublicPluginSetup } from '../../../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../../../src/plugins/home/public';
import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';
import { PluginSetupContract as AlertingPluginPublicSetup } from '../../../../../plugins/alerting/public';
import { AlertType } from '../../../../../plugins/apm/common/alert_types';
import { LicensingPluginSetup } from '../../../../../plugins/licensing/public';
import {
  AlertsContextProvider,
  TriggersAndActionsUIPublicPluginSetup,
} from '../../../../../plugins/triggers_actions_ui/public';
import { APMIndicesPermission } from '../components/app/APMIndicesPermission';
import { routes } from '../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../components/app/Main/ScrollToTopOnPathChange';
import { UpdateBreadcrumbs } from '../components/app/Main/UpdateBreadcrumbs';
import { ErrorRateAlertTrigger } from '../components/shared/ErrorRateAlertTrigger';
import { TransactionDurationAlertTrigger } from '../components/shared/TransactionDurationAlertTrigger';
import { ApmPluginContext } from '../context/ApmPluginContext';
import { LicenseProvider } from '../context/LicenseContext';
import { LoadingIndicatorProvider } from '../context/LoadingIndicatorContext';
import { LocationProvider } from '../context/LocationContext';
import { MatchedRouteProvider } from '../context/MatchedRouteContext';
import { UrlParamsProvider } from '../context/UrlParamsContext';
import { createCallApmApi } from '../services/rest/createCallApmApi';
import { createStaticIndexPattern } from '../services/rest/index_pattern';
import { px, unit, units } from '../style/variables';
import { history } from '../utils/history';
import { featureCatalogueEntry } from './featureCatalogueEntry';
import { getConfigFromInjectedMetadata } from './getConfigFromInjectedMetadata';
import { setHelpExtension } from './setHelpExtension';
import { toggleAppLinkInNav } from './toggleAppLinkInNav';
import { setReadonlyBadge } from './updateBadge';

export const REACT_APP_ROOT_ID = 'react-apm-root';

const MainContainer = styled.div`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
  height: 100%;
`;

const App = () => {
  return (
    <MainContainer data-test-subj="apmMainContainer" role="main">
      <UpdateBreadcrumbs routes={routes} />
      <Route component={ScrollToTopOnPathChange} />
      <APMIndicesPermission>
        <Switch>
          {routes.map((route, i) => (
            <ApmRoute key={i} {...route} />
          ))}
        </Switch>
      </APMIndicesPermission>
    </MainContainer>
  );
};

export type ApmPluginSetup = void;
export type ApmPluginStart = void;

export interface ApmPluginSetupDeps {
  alerting?: AlertingPluginPublicSetup;
  data: DataPublicPluginSetup;
  home: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
}

export interface ConfigSchema {
  indexPatternTitle: string;
  serviceMapEnabled: boolean;
  ui: {
    enabled: boolean;
  };
}

export class ApmPlugin
  implements Plugin<ApmPluginSetup, ApmPluginStart, ApmPluginSetupDeps, {}> {
  // When we switch over from the old platform to new platform the plugins will
  // be coming from setup instead of start, since that's where we do
  // `core.application.register`. During the transitions we put plugins on an
  // instance property so we can use it in start.
  setupPlugins: ApmPluginSetupDeps = {} as ApmPluginSetupDeps;

  constructor(
    // @ts-ignore Not using initializerContext now, but will be once NP
    // migration is complete.
    private readonly initializerContext: PluginInitializerContext<ConfigSchema>
  ) {}

  // Take the DOM element as the constructor, so we can mount the app.
  public setup(_core: CoreSetup, plugins: ApmPluginSetupDeps) {
    plugins.home.featureCatalogue.register(featureCatalogueEntry);
    this.setupPlugins = plugins;
  }

  public start(core: CoreStart) {
    const i18nCore = core.i18n;
    const plugins = this.setupPlugins;
    createCallApmApi(core.http);

    // Once we're actually an NP plugin we'll get the config from the
    // initializerContext like:
    //
    //     const config = this.initializerContext.config.get<ConfigSchema>();
    //
    // Until then we use a shim to get it from legacy injectedMetadata:
    const config = getConfigFromInjectedMetadata();

    // render APM feedback link in global help menu
    setHelpExtension(core);
    setReadonlyBadge(core);
    toggleAppLinkInNav(core, config);

    const apmPluginContextValue = {
      config,
      core,
      plugins,
    };

    plugins.triggers_actions_ui.alertTypeRegistry.register({
      id: AlertType.ErrorRate,
      name: i18n.translate('xpack.apm.alertTypes.errorRate', {
        defaultMessage: 'Error rate',
      }),
      iconClass: 'bell',
      alertParamsExpression: ErrorRateAlertTrigger,
      validate: () => ({
        errors: [],
      }),
    });

    plugins.triggers_actions_ui.alertTypeRegistry.register({
      id: AlertType.TransactionDuration,
      name: i18n.translate('xpack.apm.alertTypes.transactionDuration', {
        defaultMessage: 'Transaction duration',
      }),
      iconClass: 'bell',
      alertParamsExpression: TransactionDurationAlertTrigger,
      validate: () => ({
        errors: [],
      }),
    });

    ReactDOM.render(
      <ApmPluginContext.Provider value={apmPluginContextValue}>
        <AlertsContextProvider
          value={{
            http: core.http,
            docLinks: core.docLinks,
            toastNotifications: core.notifications.toasts,
            actionTypeRegistry: plugins.triggers_actions_ui.actionTypeRegistry,
            alertTypeRegistry: plugins.triggers_actions_ui.alertTypeRegistry,
          }}
        >
          <KibanaContextProvider services={{ ...core, ...plugins }}>
            <i18nCore.Context>
              <Router history={history}>
                <LocationProvider>
                  <MatchedRouteProvider routes={routes}>
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
          </KibanaContextProvider>
        </AlertsContextProvider>
      </ApmPluginContext.Provider>,
      document.getElementById(REACT_APP_ROOT_ID)
    );

    // create static index pattern and store as saved object. Not needed by APM UI but for legacy reasons in Discover, Dashboard etc.
    createStaticIndexPattern().catch((e) => {
      // eslint-disable-next-line no-console
      console.log('Error fetching static index pattern', e);
    });
  }

  public stop() {}
}
