/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Route } from '@kbn/shared-ux-router';
import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
} from '@elastic/eui';

import { AppMountParameters, CoreStart } from '@kbn/core/public';

const Home = () => (
  <EuiPageBody data-test-subj="chromelessAppHome">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to Chromeless!</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>Chromeless home page section title</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>Where did all the chrome go?</EuiPageSection>
    </EuiPageSection>
  </EuiPageBody>
);

const ChromelessApp = ({ basename }: { basename: string }) => (
  <Router basename={basename}>
    <EuiPage>
      <Route path="/" component={Home} />
    </EuiPage>
  </Router>
);

export const renderApp = async ({ appBasePath, element }: AppMountParameters, core: CoreStart) => {
  render(
    <KibanaRenderContextProvider {...core}>
      <ChromelessApp basename={appBasePath} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => unmountComponentAtNode(element);
};
