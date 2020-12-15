/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, RouteComponentProps } from 'react-router-dom';
import { EuiPage } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '../../../../src/core/public';

import { Page } from './components/page';
import { DocumentationPage } from './components/documentation';
import { ViewAlertPage } from './components/view_alert';
import { TriggersAndActionsUIPublicPluginStart } from '../../../plugins/triggers_actions_ui/public';
import { AlertingExamplePublicStartDeps } from './plugin';
import { ViewPeopleInSpaceAlertPage } from './components/view_astros_alert';
import { KibanaContextProvider } from '../../../../src/plugins/kibana_react/public';

export interface AlertingExampleComponentParams {
  http: CoreStart['http'];
  basename: string;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
}

const AlertingExampleApp = ({
  basename,
  http,
  triggersActionsUi,
}: AlertingExampleComponentParams) => {
  return (
    <Router basename={basename}>
      <EuiPage>
        <Route
          path={`/`}
          exact={true}
          render={() => (
            <Page title={`Home`} isHome={true}>
              <DocumentationPage triggersActionsUi={triggersActionsUi} />
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
  core: CoreStart,
  deps: AlertingExamplePublicStartDeps,
  { appBasePath, element }: AppMountParameters
) => {
  const { http } = core;
  ReactDOM.render(
    <KibanaContextProvider services={{ ...core, ...deps }}>
      <AlertingExampleApp
        basename={appBasePath}
        http={http}
        triggersActionsUi={deps.triggersActionsUi}
      />
    </KibanaContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
