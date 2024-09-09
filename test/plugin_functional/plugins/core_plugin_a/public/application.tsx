/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { History } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import { withRouter, RouteComponentProps, Redirect } from 'react-router-dom';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { Router, Route } from '@kbn/shared-ux-router';

import {
  EuiPage,
  EuiPageBody,
  EuiPageSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSidebar,
  EuiTitle,
  EuiSideNav,
} from '@elastic/eui';

import { CoreStart, AppMountParameters } from '@kbn/core/public';

const Home = () => (
  <EuiPageBody data-test-subj="fooAppHome">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to Foo!</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>Bar home page section title</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>Wow what a home page this is!</EuiPageSection>
    </EuiPageSection>
  </EuiPageBody>
);

const PageA = () => (
  <EuiPageBody data-test-subj="fooAppPageA">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Page A</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageSection>
      <EuiPageHeader>
        <EuiTitle>
          <h2>Page A section title</h2>
        </EuiTitle>
      </EuiPageHeader>
      <EuiPageSection>Page A&apos;s content goes here</EuiPageSection>
    </EuiPageSection>
  </EuiPageBody>
);

type NavProps = RouteComponentProps & {
  navigateToApp: CoreStart['application']['navigateToApp'];
};
const Nav = withRouter(({ history, navigateToApp }: NavProps) => (
  <EuiSideNav
    items={[
      {
        name: 'Foo',
        id: 'foo',
        items: [
          {
            id: 'home',
            name: 'Home',
            onClick: () => history.push('/home'),
            'data-test-subj': 'fooNavHome',
          },
          {
            id: 'page-a',
            name: 'Page A',
            onClick: () => history.push('/page-a'),
            'data-test-subj': 'fooNavPageA',
          },
          {
            id: 'linktobar',
            name: 'Open Bar / Page B',
            onClick: () => navigateToApp('bar', { path: 'page-b?query=here', state: 'foo!!' }),
            'data-test-subj': 'fooNavBarPageB',
          },
        ],
      },
    ]}
  />
));

const FooApp = ({ history, coreStart }: { history: History; coreStart: CoreStart }) => (
  <KibanaRenderContextProvider {...coreStart}>
    <Router history={history}>
      <EuiPage>
        <EuiPageSidebar>
          <Nav navigateToApp={coreStart.application.navigateToApp} />
        </EuiPageSidebar>
        <Route path="/" exact render={() => <Redirect to="/home" />} />
        <Route path="/home" exact component={Home} />
        <Route path="/page-a" component={PageA} />
      </EuiPage>
    </Router>
  </KibanaRenderContextProvider>
);

export const renderApp = (coreStart: CoreStart, { history, element }: AppMountParameters) => {
  ReactDOM.render(<FooApp history={history} coreStart={coreStart} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
