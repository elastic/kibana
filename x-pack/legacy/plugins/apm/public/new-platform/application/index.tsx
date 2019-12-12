/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AppMountParameters } from 'kibana/public';
import React from 'react';
import ReactDOM from 'react-dom';
import { Route, Router, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { routes } from '../../components/app/Main/route_config';
import { ScrollToTopOnPathChange } from '../../components/app/Main/ScrollToTopOnPathChange';
import { UpdateBreadcrumbs } from '../../components/app/Main/UpdateBreadcrumbs';
import {
  ApmPluginContext,
  ApmPluginContextValue
} from '../../context/ApmPluginContext';
import { LicenseProvider } from '../../context/LicenseContext';
import { LoadingIndicatorProvider } from '../../context/LoadingIndicatorContext';
import { LocationProvider } from '../../context/LocationContext';
import { MatchedRouteProvider } from '../../context/MatchedRouteContext';
import { UrlParamsProvider } from '../../context/UrlParamsContext';
import { px, unit, units } from '../../style/variables';
import { history } from '../../utils/history';

const MainContainer = styled.main`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
  height: 100%;
`;

const App = ({
  apmPluginContextValue
}: {
  apmPluginContextValue: ApmPluginContextValue;
}) => {
  const i18nCore = apmPluginContextValue.core.i18n;

  return (
    <ApmPluginContext.Provider value={apmPluginContextValue}>
      <i18nCore.Context>
        <Router history={history}>
          <LocationProvider>
            <MatchedRouteProvider routes={routes}>
              <UrlParamsProvider>
                <LoadingIndicatorProvider>
                  <LicenseProvider>
                    <MainContainer data-test-subj="apmMainContainer">
                      <UpdateBreadcrumbs routes={routes} />
                      <Route component={ScrollToTopOnPathChange} />
                      <Switch>
                        {routes.map((route, i) => (
                          <Route key={i} {...route} />
                        ))}
                      </Switch>
                    </MainContainer>
                  </LicenseProvider>
                </LoadingIndicatorProvider>
              </UrlParamsProvider>
            </MatchedRouteProvider>
          </LocationProvider>
        </Router>
      </i18nCore.Context>
    </ApmPluginContext.Provider>
  );
};

export function renderApp(
  apmPluginContextValue: ApmPluginContextValue,
  params: AppMountParameters
) {
  ReactDOM.render(
    <App apmPluginContextValue={apmPluginContextValue} />,
    params.element
  );
  return () => ReactDOM.unmountComponentAtNode(params.element);
}
