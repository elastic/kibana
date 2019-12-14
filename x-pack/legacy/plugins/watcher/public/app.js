/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HashRouter, Switch, Route, Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { WatchStatus } from './sections/watch_status/components/watch_status';
import { WatchEdit } from './sections/watch_edit/components/watch_edit';
import { WatchList } from './sections/watch_list/components/watch_list';
import { registerRouter } from './lib/navigation';
import { BASE_PATH } from './constants';
import { LICENSE_STATUS_VALID } from '../../../common/constants';
import { EuiCallOut, EuiLink } from '@elastic/eui';

class ShareRouter extends Component {
  static contextTypes = {
    router: PropTypes.shape({
      history: PropTypes.shape({
        push: PropTypes.func.isRequired,
        createHref: PropTypes.func.isRequired,
      }).isRequired,
    }).isRequired,
  };
  constructor(...args) {
    super(...args);
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
export const App = ({ licenseStatus }) => {
  const { status, message } = licenseStatus;

  if (status !== LICENSE_STATUS_VALID) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.watcher.app.licenseErrorTitle"
            defaultMessage="License error"
          />
        }
        color="warning"
        iconType="help"
      >
        {message}{' '}
        <EuiLink href="#/management/elasticsearch/license_management/home">
          <FormattedMessage
            id="xpack.watcher.app.licenseErrorLinkText"
            defaultMessage="Manage your license."
          />
        </EuiLink>
      </EuiCallOut>
    );
  }

  return (
    <HashRouter>
      <ShareRouter>
        <AppWithoutRouter />
      </ShareRouter>
    </HashRouter>
  );
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => (
  <Switch>
    <Route exact path={`${BASE_PATH}watches`} component={WatchList} />
    <Route exact path={`${BASE_PATH}watches/watch/:id/status`} component={WatchStatus} />
    <Route exact path={`${BASE_PATH}watches/watch/:id/edit`} component={WatchEdit} />
    <Route
      exact
      path={`${BASE_PATH}watches/new-watch/:type(json|threshold)`}
      component={WatchEdit}
    />
    <Redirect from={BASE_PATH} to={`${BASE_PATH}watches`} />
  </Switch>
);
