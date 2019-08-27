/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import styled from 'styled-components';
import { LegacyCoreStart } from 'src/core/public';
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
import { useUpdateBadgeEffect } from '../components/app/Main/useUpdateBadgeEffect';
import { MatchedRouteProvider } from '../context/MatchedRouteContext';

export const REACT_APP_ROOT_ID = 'react-apm-root';

const MainContainer = styled.div`
  min-width: ${px(unit * 50)};
  padding: ${px(units.plus)};
`;

const App = () => {
  useUpdateBadgeEffect();

  return (
    <MatchedRouteProvider>
      <UrlParamsProvider>
        <LoadingIndicatorProvider>
          <MainContainer data-test-subj="apmMainContainer">
            <UpdateBreadcrumbs />
            <Route component={ScrollToTopOnPathChange} />
            <LicenseProvider>
              <Switch>
                {routes.map((route, i) => (
                  <Route key={i} {...route} />
                ))}
              </Switch>
            </LicenseProvider>
          </MainContainer>
        </LoadingIndicatorProvider>
      </UrlParamsProvider>
    </MatchedRouteProvider>
  );
};

export class Plugin {
  public start(core: LegacyCoreStart) {
    const { i18n } = core;
    ReactDOM.render(
      <KibanaCoreContextProvider core={core}>
        <i18n.Context>
          <Router history={history}>
            <LocationProvider>
              <App />
            </LocationProvider>
          </Router>
        </i18n.Context>
      </KibanaCoreContextProvider>,
      document.getElementById(REACT_APP_ROOT_ID)
    );
  }
}
