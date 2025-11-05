/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { CoreStart, AppMountParameters } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router, Route, Routes } from '@kbn/shared-ux-router';
import { useLocation } from 'react-router-dom';
import { EuiPage, EuiPageBody } from '@elastic/eui';
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

const CloudConnectedAppRoutes: React.FC<{
  chrome: CoreStart['chrome'];
  application: CoreStart['application'];
  http: CoreStart['http'];
  docLinks: CoreStart['docLinks'];
  history: AppMountParameters['history'];
}> = ({ chrome, application, http, docLinks, history }) => {
  const location = useLocation();
  const [isConnected, setIsConnected] = useState(false);

  useBreadcrumbs(chrome, application, location.pathname);

  const handleConnect = (apiKey: string) => {
    // TODO: Implement actual connection logic
    console.log('Connecting with API key:', apiKey);
    setIsConnected(true);
    history.push('/services');
  };

  return (
    <EuiPage restrictWidth={1200}>
      <EuiPageBody>
        <Routes>
          <Route path="/" exact>
            <OnboardingPage
              onConnect={handleConnect}
              addBasePath={http.basePath.prepend}
              docLinksSecureSavedObject={docLinks.links.kibana.secureSavedObject}
            />
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
    <Router history={history}>
      <CloudConnectedAppRoutes
        chrome={chrome}
        application={application}
        http={http}
        docLinks={docLinks}
        history={history}
      />
    </Router>
  );
};

export const CloudConnectedApp = (core: CoreStart, params: AppMountParameters) => {
  ReactDOM.render(
    <KibanaRenderContextProvider i18n={core.i18n} theme={core.theme}>
      <CloudConnectedAppComponent
        chrome={core.chrome}
        application={core.application}
        http={core.http}
        docLinks={core.docLinks}
        history={params.history}
      />
    </KibanaRenderContextProvider>,
    params.element
  );

  return () => ReactDOM.unmountComponentAtNode(params.element);
};
