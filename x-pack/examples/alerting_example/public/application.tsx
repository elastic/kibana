/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, RouteComponentProps } from 'react-router-dom';
import { EuiPage } from '@elastic/eui';
import { AppMountParameters, CoreStart } from '@kbn/core/public';

import { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Page } from './components/page';
import { DocumentationPage } from './components/documentation';
import { ViewAlertPage } from './components/view_alert';
import { AlertingExamplePublicStartDeps } from './plugin';
import { ViewPeopleInSpaceAlertPage } from './components/view_astros_alert';

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
          path={`/rule/:id`}
          render={(props: RouteComponentProps<{ id: string }>) => {
            return (
              <Page title={`View Rule`} crumb={`View Rule ${props.match.params.id}`}>
                <ViewAlertPage http={http} id={props.match.params.id} />
              </Page>
            );
          }}
        />
        <Route
          path={`/astros/:id`}
          render={(props: RouteComponentProps<{ id: string }>) => {
            return (
              <Page title={`View People In Space Rule`} crumb={`Astros ${props.match.params.id}`}>
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
