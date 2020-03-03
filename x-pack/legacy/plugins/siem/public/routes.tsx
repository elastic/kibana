/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React, { FC, memo } from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { NotFoundPage } from './pages/404';
import { HomePage } from './pages/home';
import { ManageRoutesSpy } from './utils/route/manage_spy_routes';

interface RouterProps {
  history: History;
}

const PageRouterComponent: FC<RouterProps> = ({ history }) => (
  <ManageRoutesSpy>
    <Router history={history}>
      <Switch>
        <Route path="/">
          <HomePage />
        </Route>
        <Route>
          <NotFoundPage />
        </Route>
      </Switch>
    </Router>
  </ManageRoutesSpy>
);

export const PageRouter = memo(PageRouterComponent);
