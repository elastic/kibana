/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { useParams } from 'react-router-dom-v5-compat';
import { Route } from '@kbn/shared-ux-router';
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

const ViewAlertPageRoute = ({ http }: { http: AlertingExampleComponentParams['http'] }) => {
  const params = useParams();

  return (
    <Page title={`View Rule`} crumb={`View Rule ${params.id}`}>
      <ViewAlertPage http={http} id={params.id as string} />
    </Page>
  );
};

const ViewPeopleInSpaceAlertPageRoute = ({
  http,
}: {
  http: AlertingExampleComponentParams['http'];
}) => {
  const params = useParams();

  return (
    <Page title={`View People In Space Rule`} crumb={`Astros ${params.id}`}>
      <ViewPeopleInSpaceAlertPage http={http} id={params.id as string} />
    </Page>
  );
};

const AlertingExampleApp = ({
  basename,
  http,
  triggersActionsUi,
}: AlertingExampleComponentParams) => {
  return (
    <Router basename={basename}>
      <EuiPage>
        <Route path={`/`} exact={true}>
          <Page title={`Home`} isHome={true}>
            <DocumentationPage triggersActionsUi={triggersActionsUi} />
          </Page>
        </Route>
        <Route path={`/rule/:id`}>
          <ViewAlertPageRoute http={http} />
        </Route>
        <Route path={`/astros/:id`}>
          <ViewPeopleInSpaceAlertPageRoute http={http} />
        </Route>
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
