/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import { EuiFlexGroup, EuiFlexItem, EuiPage, EuiSpacer, EuiTitle } from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { ApolloProvider } from 'react-apollo';
import { Provider as ReduxProvider } from 'react-redux';
import { BrowserRouter as Router, Route, RouteComponentProps, Switch } from 'react-router-dom';
import { capabilities } from 'ui/capabilities';
import { I18nContext } from 'ui/i18n';
import { UMGraphQLClient, UMUpdateBreadcrumbs, UMUpdateBadge } from './lib/lib';
import { MonitorPage, OverviewPage, NotFoundPage } from './pages';
import { UptimeRefreshContext, UptimeSettingsContext, UMSettingsContextValues } from './contexts';
import { UptimeDatePicker } from './components/functional/uptime_date_picker';
import { useUrlParams } from './hooks';
import { store } from './state';

export interface UptimeAppColors {
  danger: string;
  success: string;
  range: string;
  mean: string;
  warning: string;
}

export interface UptimeAppProps {
  basePath: string;
  client: UMGraphQLClient;
  darkMode: boolean;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  logMonitorPageLoad: () => void;
  logOverviewPageLoad: () => void;
  routerBasename: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  setBadge: UMUpdateBadge;
  renderGlobalHelpControls(): void;
}

const Application = (props: UptimeAppProps) => {
  const {
    basePath,
    client,
    darkMode,
    isApmAvailable,
    isInfraAvailable,
    isLogsAvailable,
    logMonitorPageLoad,
    logOverviewPageLoad,
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
      range: euiDarkVars.euiFocusBackgroundColor,
      success: euiDarkVars.euiColorSuccess,
      warning: euiDarkVars.euiColorWarning,
    };
  } else {
    colors = {
      danger: euiLightVars.euiColorDanger,
      mean: euiLightVars.euiColorPrimary,
      range: euiLightVars.euiFocusBackgroundColor,
      success: euiLightVars.euiColorSuccess,
      warning: euiLightVars.euiColorWarning,
    };
  }

  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [headingText, setHeadingText] = useState<string | undefined>(undefined);

  useEffect(() => {
    renderGlobalHelpControls();
    setBadge(
      !capabilities.get().uptime.save
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
  }, []);

  const refreshApp = () => {
    setLastRefresh(Date.now());
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
      setHeadingText,
    };
  };

  return (
    <I18nContext>
      <ReduxProvider store={store}>
        <Router basename={routerBasename}>
          <Route
            path="/"
            render={(rootRouteProps: RouteComponentProps) => {
              return (
                <ApolloProvider client={client}>
                  <UptimeRefreshContext.Provider value={{ lastRefresh, ...rootRouteProps }}>
                    <UptimeSettingsContext.Provider value={initializeSettingsContextValues()}>
                      <EuiPage className="app-wrapper-panel " data-test-subj="uptimeApp">
                        <div>
                          <EuiFlexGroup
                            alignItems="center"
                            justifyContent="spaceBetween"
                            gutterSize="s"
                          >
                            <EuiFlexItem>
                              <EuiTitle>
                                <h1>{headingText}</h1>
                              </EuiTitle>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <UptimeDatePicker refreshApp={refreshApp} {...rootRouteProps} />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                          <EuiSpacer size="s" />
                          <Switch>
                            <Route
                              exact
                              path="/"
                              render={routerProps => (
                                <OverviewPage
                                  basePath={basePath}
                                  logOverviewPageLoad={logOverviewPageLoad}
                                  setBreadcrumbs={setBreadcrumbs}
                                  {...routerProps}
                                />
                              )}
                            />
                            <Route
                              path="/monitor/:monitorId/:location?"
                              render={routerProps => (
                                <MonitorPage
                                  logMonitorPageLoad={logMonitorPageLoad}
                                  query={client.query}
                                  setBreadcrumbs={setBreadcrumbs}
                                  {...routerProps}
                                />
                              )}
                            />
                            <Route component={NotFoundPage} />
                          </Switch>
                        </div>
                      </EuiPage>
                    </UptimeSettingsContext.Provider>
                  </UptimeRefreshContext.Provider>
                </ApolloProvider>
              );
            }}
          />
        </Router>
      </ReduxProvider>
    </I18nContext>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
