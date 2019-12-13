/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  ChromeStart,
  DocLinksStart,
  HttpSetup,
  ToastsSetup,
  IUiSettingsClient,
} from 'src/core/public';

import { EuiCallOut, EuiLink } from '@elastic/eui';
import {
  HashRouter,
  Switch,
  Route,
  Redirect,
  withRouter,
  RouteComponentProps,
} from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { WatchStatus } from './sections/watch_status/components/watch_status';
import { WatchEdit } from './sections/watch_edit/components/watch_edit';
import { WatchList } from './sections/watch_list/components/watch_list';
import { registerRouter } from './lib/navigation';
import { BASE_PATH } from './constants';
import { LICENSE_STATUS_VALID } from '../../../../../common/constants';
import { AppContextProvider } from './app_context';
import { LegacyDependencies } from '../types';

const ShareRouter = withRouter(({ children, history }: RouteComponentProps & { children: any }) => {
  registerRouter({ history });
  return children;
});

export interface AppDeps {
  chrome: ChromeStart;
  docLinks: DocLinksStart;
  toasts: ToastsSetup;
  http: HttpSetup;
  uiSettings: IUiSettingsClient;
  legacy: LegacyDependencies;
  euiUtils: any;
}

export const App = (deps: AppDeps) => {
  const { status, message } = deps.legacy.licenseStatus;

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
        <AppContextProvider value={deps}>
          <AppWithoutRouter />
        </AppContextProvider>
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
