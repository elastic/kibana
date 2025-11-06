/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from '@kbn/core/public';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { CloudConnectedAppContextProvider } from './application/app_context';
import { useBreadcrumbs } from './hooks/use_breadcrumbs';
import { OnboardingPage } from './components/onboarding';
import { ConnectedServicesPage } from './components/connected_services';

interface CloudConnectedAppComponentProps {
  chrome: CoreStart['chrome'];
  application: CoreStart['application'];
  http: CoreStart['http'];
  docLinks: CoreStart['docLinks'];
  history: AppMountParameters['history'];
}

const CloudConnectedAppRoutes: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);

  useBreadcrumbs();

  const handleConnect = (apiKey: string) => {
    // TODO: Implement actual connection logic
    console.log('Connecting with API key:', apiKey);
    setIsConnected(true);
  };

  return (
    <EuiPage restrictWidth={1200}>
      <EuiPageBody>
        <Routes>
          <Route path="/" exact>
            <OnboardingPage onConnect={handleConnect} />
          </Route>
          <Route path="/services">
            <ConnectedServicesPage />
          </Route>
        </Routes>
      </EuiPageBody>
    </EuiPage>
  );
};

const CloudConnectedAppComponent: React.FC<CloudConnectedAppComponentProps> = ({
  chrome,
  application,
  http,
  docLinks,
  history,
}) => {
  return (
    <CloudConnectedAppContextProvider
      value={{ chrome, application, http, docLinks, history }}
    >
      <Router history={history}>
        <CloudConnectedAppRoutes />
      </Router>
    </CloudConnectedAppContextProvider>
  );
};

export const CloudConnectedApp = (core: CoreStart, params: AppMountParameters) => {
  ReactDOM.render(
    core.rendering.addContext(
      <CloudConnectedAppComponent
        chrome={core.chrome}
        application={core.application}
        http={core.http}
        docLinks={core.docLinks}
        history={params.history}
      />
    ),
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
