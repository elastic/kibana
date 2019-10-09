/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Component } from 'react';
import { some } from 'fp-ts/lib/Option';
import PropTypes from 'prop-types';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';

import { ActionsList } from './sections/actions_list/components/actions_list';
import { registerRouter } from './lib/navigation';
import { BASE_PATH } from './constants';

class ShareRouter extends Component {
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.shape({
        push: PropTypes.func.isRequired,
        createHref: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
  };
  constructor(props: any, context?: any) {
    super(props, context);
    this.registerRouter();
  }

  registerRouter() {
    // Share the router with the app without requiring React or context.
    const { router } = this.context;
    registerRouter(router);
  }

  render() {
    return this.props.children;
  }
}

export const App = (api: any) => {
  return (
    <HashRouter>
      <ShareRouter>
        <AppWithoutRouter api={api} />
      </ShareRouter>
    </HashRouter>
  );
};

export const AppWithoutRouter = ({ api }: any) => (
  <Switch>
    <Route exact path={`${BASE_PATH}actions`} render={() => <ActionsList api={some(api)} />} />
    <Redirect from={BASE_PATH} to={`${BASE_PATH}actions`} />
  </Switch>
);
