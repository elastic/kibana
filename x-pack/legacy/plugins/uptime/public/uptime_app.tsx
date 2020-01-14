/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { EuiPage } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter as Router, Route, RouteComponentProps } from 'react-router-dom';
import { I18nStart, ChromeBreadcrumb, LegacyCoreStart } from 'src/core/public';
import { PluginsStart } from 'ui/new_platform/new_platform';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import { UMGraphQLClient, UMUpdateBreadcrumbs, UMUpdateBadge } from './lib/lib';
import { UptimeRefreshContext, UptimeSettingsContext, UMSettingsContextValues } from './contexts';
import { CommonlyUsedRange } from './components/functional/uptime_date_picker';
import { useUrlParams } from './hooks';
import { store } from './state';
import { setBasePath, triggerAppRefresh } from './state/actions';
import { PageRouter } from './routes';

export interface UptimeAppColors {
  danger: string;
  success: string;
  gray: string;
  range: string;
  mean: string;
  warning: string;
}

export interface UptimeAppProps {
  basePath: string;
  canSave: boolean;
  client: UMGraphQLClient;
  core: LegacyCoreStart;
  darkMode: boolean;
  i18n: I18nStart;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  kibanaBreadcrumbs: ChromeBreadcrumb[];
  plugins: PluginsStart;
  routerBasename: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  setBadge: UMUpdateBadge;
  renderGlobalHelpControls(): void;
  commonlyUsedRanges: CommonlyUsedRange[];
}

const Application = (props: UptimeAppProps) => {
  const {
    basePath,
    canSave,
    client,
    core,
    darkMode,
    commonlyUsedRanges,
    i18n: i18nCore,
    isApmAvailable,
    isInfraAvailable,
    isLogsAvailable,
    plugins,
    renderGlobalHelpControls,
    routerBasename,
    setBreadcrumbs,
    setBadge,
  } = props;

  let colors: UptimeAppColors;
  if (darkMode) {
    colors = {
      danger: euiDarkVars.euiColorDanger,
      mean: euiDarkVars.euiColorPrimary,
      gray: euiDarkVars.euiColorLightShade,
      range: euiDarkVars.euiFocusBackgroundColor,
      success: euiDarkVars.euiColorSuccess,
      warning: euiDarkVars.euiColorWarning,
    };
  } else {
    colors = {
      danger: euiLightVars.euiColorDanger,
      mean: euiLightVars.euiColorPrimary,
      gray: euiLightVars.euiColorLightShade,
      range: euiLightVars.euiFocusBackgroundColor,
      success: euiLightVars.euiColorSuccess,
      warning: euiLightVars.euiColorWarning,
    };
  }

  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  useEffect(() => {
    renderGlobalHelpControls();
    setBadge(
      !canSave
        ? {
            text: i18n.translate('xpack.uptime.badge.readOnly.text', {
              defaultMessage: 'Read only',
            }),
            tooltip: i18n.translate('xpack.uptime.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save',
            }),
            iconType: 'glasses',
          }
        : undefined
    );
  }, [canSave, renderGlobalHelpControls, setBadge]);

  const refreshApp = () => {
    const refreshTime = Date.now();
    setLastRefresh(refreshTime);
    store.dispatch(triggerAppRefresh(refreshTime));
  };

  const [getUrlParams] = useUrlParams();
  const initializeSettingsContextValues = (): UMSettingsContextValues => {
    const {
      autorefreshInterval,
      autorefreshIsPaused,
      dateRangeStart,
      dateRangeEnd,
    } = getUrlParams();
    const absoluteStartDate = DateMath.parse(dateRangeStart);
    const absoluteEndDate = DateMath.parse(dateRangeEnd);
    return {
      // TODO: extract these values to dedicated (and more sensible) constants
      absoluteStartDate: absoluteStartDate ? absoluteStartDate.valueOf() : 0,
      absoluteEndDate: absoluteEndDate ? absoluteEndDate.valueOf() : 1,
      autorefreshInterval,
      autorefreshIsPaused,
      basePath,
      colors,
      dateRangeStart,
      dateRangeEnd,
      isApmAvailable,
      isInfraAvailable,
      isLogsAvailable,
      refreshApp,
      commonlyUsedRanges,
    };
  };

  store.dispatch(setBasePath(basePath));

  return (
    <i18nCore.Context>
      <ReduxProvider store={store}>
        <KibanaContextProvider services={{ ...core, ...plugins }}>
          <Router basename={routerBasename}>
            <Route
              path="/"
              render={(rootRouteProps: RouteComponentProps) => {
                return (
                  <ApolloProvider client={client}>
                    <UptimeRefreshContext.Provider value={{ lastRefresh, ...rootRouteProps }}>
                      <UptimeSettingsContext.Provider value={initializeSettingsContextValues()}>
                        <EuiPage className="app-wrapper-panel " data-test-subj="uptimeApp">
                          <main>
                            <PageRouter
                              autocomplete={plugins.data.autocomplete}
                              basePath={basePath}
                              setBreadcrumbs={setBreadcrumbs}
                            />
                          </main>
                        </EuiPage>
                      </UptimeSettingsContext.Provider>
                    </UptimeRefreshContext.Provider>
                  </ApolloProvider>
                );
              }}
            />
          </Router>
        </KibanaContextProvider>
      </ReduxProvider>
    </i18nCore.Context>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
