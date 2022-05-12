/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Switch } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { CaptureTest } from './containers/capture_test';
import { Main } from './containers/main';
import { ApplicationContextProvider } from './application_context';
import { SetupDeps, StartDeps, MyForwardableState } from './types';
import { ROUTES } from './constants';

export const renderApp = (
  coreStart: CoreStart,
  deps: Omit<StartDeps & SetupDeps, 'developerExamples'>,
  { appBasePath, element, history }: AppMountParameters, // FIXME: appBasePath is deprecated
  forwardedParams: MyForwardableState
) => {
  ReactDOM.render(
    <ApplicationContextProvider forwardedState={forwardedParams}>
      <KibanaThemeProvider theme$={coreStart.theme.theme$}>
        <Router history={history}>
          <Switch>
            <Route path={ROUTES.captureTest} exact render={() => <CaptureTest />} />
            <Route render={() => <Main basename={appBasePath} {...coreStart} {...deps} />} />
          </Switch>
        </Router>
      </KibanaThemeProvider>
    </ApplicationContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
