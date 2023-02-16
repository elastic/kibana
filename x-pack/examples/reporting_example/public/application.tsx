/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiListGroup, EuiPageTemplate, EuiTitle } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { Route } from '@kbn/shared-ux-router';
import { parsePath } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import { Redirect, Router, Switch } from 'react-router-dom';
import { ApplicationContextProvider } from './application_context';
import { ROUTES } from './constants';
import { CaptureTest } from './containers/capture_test';
import { Main } from './containers/main';
import { CsvExplorer } from './csv';
import { MyForwardableState, SetupDeps, StartDeps } from './types';

export const renderApp = (
  core: CoreStart,
  deps: Omit<StartDeps & SetupDeps, 'developerExamples'>,
  { element, history }: AppMountParameters,
  forwardedParams: MyForwardableState
) => {
  const myLinkContent = [
    {
      label: 'Custom Reporting',
      href: history.createHref(parsePath(ROUTES.main)),
      iconType: 'home',
    },
    {
      label: 'CSV Explorer',
      href: history.createHref(parsePath(ROUTES.csv)),
      iconType: 'database',
    },
  ];

  ReactDOM.render(
    <ApplicationContextProvider forwardedState={forwardedParams}>
      <KibanaThemeProvider theme$={core.theme.theme$}>
        <EuiPageTemplate offset={0} restrictWidth={false}>
          <EuiPageTemplate.Sidebar>
            <EuiListGroup listItems={myLinkContent} color="primary" size="s" />
          </EuiPageTemplate.Sidebar>
          <Router history={history}>
            <Switch>
              <Route exact path={ROUTES.captureTest} render={() => <CaptureTest />} />
              <Route exact path={ROUTES.csv}>
                <EuiPageTemplate.Header>
                  <EuiTitle size="l">
                    <h1>CSV Explorer</h1>
                  </EuiTitle>
                </EuiPageTemplate.Header>
                <EuiPageTemplate.Section>
                  <CsvExplorer core={core} {...deps} />
                </EuiPageTemplate.Section>
              </Route>
              <Route path={ROUTES.main}>
                <EuiPageTemplate.Header>
                  <EuiTitle size="l">
                    <h1>Custom Reporting Example</h1>
                  </EuiTitle>
                </EuiPageTemplate.Header>
                <EuiPageTemplate.Section>
                  <Main {...deps} />
                </EuiPageTemplate.Section>
              </Route>
              <Redirect strict to={ROUTES.main} />
            </Switch>
          </Router>
        </EuiPageTemplate>
        ,
      </KibanaThemeProvider>
    </ApplicationContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
