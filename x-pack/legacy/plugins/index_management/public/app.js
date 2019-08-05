/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';
import { BASE_PATH, UIM_APP_LOAD } from '../common/constants';
import { IndexManagementHome } from './sections/home';
import { trackUiMetric } from './services';

export const App = () => {
  useEffect(() => trackUiMetric('loaded', UIM_APP_LOAD), []);

  return (
    <HashRouter>
      <AppWithoutRouter />
    </HashRouter>
  );
};

// Exoprt this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Switch>
    <Route path={`${BASE_PATH}:section(indices|templates)`} component={IndexManagementHome} />
    <Redirect from={`${BASE_PATH}`} to={`${BASE_PATH}indices`}/>
  </Switch>
);
