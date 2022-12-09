/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, Routes } from 'react-router-dom';
import { AppMountParameters, CoreStart } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { CaptureTest } from './containers/capture_test';
import { Main } from './containers/main';
import { ApplicationContextProvider } from './application_context';
import { SetupDeps, StartDeps, MyForwardableState } from './types';
import { ROUTES } from './constants';

const App = ({
  coreStart,
  forwardedParams,
  mountParams,
  deps,
}: {
  coreStart: CoreStart;
  forwardedParams: MyForwardableState;
  mountParams: AppMountParameters;
  deps: Omit<StartDeps & SetupDeps, 'developerExamples'>;
}) => {
  return (
    <ApplicationContextProvider forwardedState={forwardedParams}>
      <KibanaThemeProvider theme$={coreStart.theme.theme$}>
        <Router navigator={mountParams.history} location={mountParams.history.location}>
          <Routes>
            <Route path={ROUTES.captureTest} element={<CaptureTest />} />
            <Route element={<Main basename={mountParams.appBasePath} {...coreStart} {...deps} />} />
          </Routes>
        </Router>
      </KibanaThemeProvider>
    </ApplicationContextProvider>
  );
};

export const renderApp = (
  coreStart: CoreStart,
  deps: Omit<StartDeps & SetupDeps, 'developerExamples'>,
  mountParams: AppMountParameters, // FIXME: appBasePath is deprecated
  forwardedParams: MyForwardableState
) => {
  const { element } = mountParams;
  ReactDOM.render(
    <App
      coreStart={coreStart}
      deps={deps}
      mountParams={mountParams}
      forwardedParams={forwardedParams}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
