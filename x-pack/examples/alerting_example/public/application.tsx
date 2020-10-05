/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, RouteComponentProps } from 'react-router-dom';
import { EuiPage } from '@elastic/eui';
import {
  AppMountParameters,
  CoreStart,
  IUiSettingsClient,
  DocLinksStart,
  ToastsSetup,
  ApplicationStart,
} from '../../../../src/core/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { ChartsPluginStart } from '../../../../src/plugins/charts/public';

import { Page } from './components/page';
import { DocumentationPage } from './components/documentation';
import { ViewAlertPage } from './components/view_alert';
import { TriggersAndActionsUIPublicPluginStart } from '../../../plugins/triggers_actions_ui/public';
import { AlertingExamplePublicStartDeps } from './plugin';
import { ViewPeopleInSpaceAlertPage } from './components/view_astros_alert';

export interface AlertingExampleComponentParams {
  application: CoreStart['application'];
  http: CoreStart['http'];
  basename: string;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  data: DataPublicPluginStart;
  charts: ChartsPluginStart;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart;
  toastNotifications: ToastsSetup;
  capabilities: ApplicationStart['capabilities'];
}

const AlertingExampleApp = (deps: AlertingExampleComponentParams) => {
  const { basename, http } = deps;
  return (
    <Router basename={basename}>
      <EuiPage>
        <Route
          path={`/`}
          exact={true}
          render={() => (
            <Page title={`Home`} isHome={true}>
              <DocumentationPage {...deps} />
            </Page>
          )}
        />
        <Route
          path={`/alert/:id`}
          render={(props: RouteComponentProps<{ id: string }>) => {
            return (
              <Page title={`View Alert`} crumb={`View Alert ${props.match.params.id}`}>
                <ViewAlertPage http={http} id={props.match.params.id} />
              </Page>
            );
          }}
        />
        <Route
          path={`/astros/:id`}
          render={(props: RouteComponentProps<{ id: string }>) => {
            return (
              <Page title={`View People In Space Alert`} crumb={`Astros ${props.match.params.id}`}>
                <ViewPeopleInSpaceAlertPage http={http} id={props.match.params.id} />
              </Page>
            );
          }}
        />
      </EuiPage>
    </Router>
  );
};

export const renderApp = (
  { application, notifications, http, uiSettings, docLinks }: CoreStart,
  deps: AlertingExamplePublicStartDeps,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <AlertingExampleApp
      basename={appBasePath}
      application={application}
      toastNotifications={notifications.toasts}
      http={http}
      uiSettings={uiSettings}
      docLinks={docLinks}
      capabilities={application.capabilities}
      {...deps}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
