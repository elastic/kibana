/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ApolloConsumer } from 'react-apollo';

import { Router, Switch, Route, Redirect, useHistory } from 'react-router-dom';
import { TimelinesPage } from './timelines_page';
import { SiemPageName } from '../home/types';

const timelinesPagePath = `/:pageName(${SiemPageName.timelines})/:tabName(default|template)`;
const timelinesDefaultPath = `/${SiemPageName.timelines}/default`;
export const Timelines = React.memo(() => {
  const history = useHistory();
  return (
    <Router history={history}>
      <Switch>
        <Route path={timelinesPagePath}>
          <ApolloConsumer>{client => <TimelinesPage apolloClient={client} />}</ApolloConsumer>
        </Route>
        <Redirect to={timelinesDefaultPath} />
      </Switch>
    </Router>
  );
});

Timelines.displayName = 'Timelines';
