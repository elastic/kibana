/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { NotFoundPage } from './pages/404';
import { HomePage } from './pages/home';

interface RouterProps {
  history: History;
}

export const PageRouter = pure<RouterProps>(({ history }) => (
  <Router history={history}>
    <Switch>
      <Route path="/" component={HomePage} />
      <Route component={NotFoundPage} />
    </Switch>
  </Router>
));
