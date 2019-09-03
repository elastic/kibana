/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { HashRouter as Router, Redirect, Switch } from 'react-router-dom';

import { connect } from 'react-redux';
import { RootState } from '../reducers';
import { Admin } from './admin_page/admin';
import { SetupGuide } from './admin_page/setup_guide';
import { Diff } from './diff_page/diff';
import { Main } from './main/main';
import { NotFound } from './main/not_found';
import { Route } from './route';
import * as ROUTES from './routes';
import { Search } from './search_page/search';

const RooComponent = (props: { setupOk?: boolean }) => {
  if (props.setupOk) {
    return <Redirect to={'/admin'} />;
  }
  return <SetupGuide />;
};

const mapStateToProps = (state: RootState) => ({
  setupOk: state.setup.ok,
});

const Root = connect(mapStateToProps)(RooComponent);

const Empty = () => null;

export const App = () => {
  return (
    <Router>
      <Switch>
        <Route path={ROUTES.DIFF} exact={true} component={Diff} />
        <Route path={ROUTES.ROOT} exact={true} component={Root} />
        <Route path={ROUTES.MAIN} component={Main} exact={true} />
        <Route path={ROUTES.MAIN_ROOT} component={Main} />
        <Route path={ROUTES.ADMIN} component={Admin} />
        <Route path={ROUTES.SEARCH} component={Search} />
        <Route path={ROUTES.REPO} render={Empty} exact={true} />
        <Route path={ROUTES.SETUP} component={SetupGuide} exact={true} />
        <Route path="*" component={NotFound} />
      </Switch>
    </Router>
  );
};
