/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HashRouter, Switch, Route, Redirect, withRouter } from 'react-router-dom';

import { UIM_APP_LOAD } from '../../common';
import { CRUD_APP_BASE_PATH } from './constants';
import { registerRouter, setUserHasLeftApp, trackUiMetric, METRIC_TYPE } from './services';
import { JobList, JobCreate } from './sections';

class ShareRouterComponent extends Component {
  static propTypes = {
    history: PropTypes.shape({
      push: PropTypes.func.isRequired,
      createHref: PropTypes.func.isRequired,
    }).isRequired,
  };

  constructor(...args) {
    super(...args);
    this.registerRouter();
  }

  registerRouter() {
    // Share the router with the app without requiring React or context.
    const { history } = this.props;
    registerRouter({ history });
  }

  render() {
    return this.props.children;
  }
}

const ShareRouter = withRouter(ShareRouterComponent);

export class App extends Component { // eslint-disable-line react/no-multi-comp
  componentDidMount() {
    trackUiMetric(METRIC_TYPE.LOADED, UIM_APP_LOAD);
  }

  componentWillUnmount() {
    // Set internal flag so we can prevent reacting to route changes internally.
    setUserHasLeftApp(true);
  }

  render() {
    return (
      <HashRouter>
        <ShareRouter>
          <Switch>
            <Redirect exact from={`${CRUD_APP_BASE_PATH}`} to={`${CRUD_APP_BASE_PATH}/job_list`} />
            <Route exact path={`${CRUD_APP_BASE_PATH}/job_list`} component={JobList} />
            <Route exact path={`${CRUD_APP_BASE_PATH}/create`} component={JobCreate} />
          </Switch>
        </ShareRouter>
      </HashRouter>
    );
  }
}
