/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import DateMath from '@elastic/datemath';
import React, { useEffect, useState } from 'react';
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';
import { Switch, Route } from 'react-router';
import { EuiPage, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { ApolloProvider } from 'react-apollo';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { useUrlParams } from '../hooks';
import { UptimeSettingsContext, UptimeRefreshContext } from '../contexts';
import { UptimeAppColors } from '../uptime_app';
import { UptimeDatePicker } from '../components/functional/uptime_date_picker';
import { OverviewPage, MonitorPage } from '.';
// import { useTest } from '../hooks/use_test';

export const MainPage = ({
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
  rootRouteProps,
}: any) => {
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [headingText, setHeadingText] = useState<string | undefined>(undefined);
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
  // const t = useTest('few');
  // console.log(t);
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
  const [{ autorefreshInterval, autorefreshIsPaused, dateRangeStart, dateRangeEnd }] = useUrlParams(
    history,
    location
  );
  const absoluteStartDate = DateMath.parse(dateRangeStart);
  const absoluteEndDate = DateMath.parse(dateRangeEnd);
  return (
    <ApolloProvider client={client}>
      <UptimeSettingsContext.Provider
        value={{
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
        }}
      >
        <UptimeRefreshContext.Provider value={{ lastRefresh }}>
          <EuiPage className="app-wrapper-panel " data-test-subj="uptimeApp">
            <div>
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem grow={false}>
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
                  path="/monitor/:id/:location?"
                  render={routerProps => (
                    <MonitorPage
                      logMonitorPageLoad={logMonitorPageLoad}
                      query={client.query}
                      setBreadcrumbs={setBreadcrumbs}
                      {...routerProps}
                    />
                  )}
                />
              </Switch>
            </div>
          </EuiPage>
        </UptimeRefreshContext.Provider>
      </UptimeSettingsContext.Provider>
    </ApolloProvider>
  );
};
