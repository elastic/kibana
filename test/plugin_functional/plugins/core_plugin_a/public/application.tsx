/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { History } from 'history';
import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Route, withRouter, RouteComponentProps, Redirect } from 'react-router-dom';

import {
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPageSideBar,
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
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Bar home page section title</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>Wow what a home page this is!</EuiPageContentBody>
    </EuiPageContent>
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
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Page A section title</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>Page A&apos;s content goes here</EuiPageContentBody>
    </EuiPageContent>
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
  <Router history={history}>
    <EuiPage>
      <EuiPageSideBar>
        <Nav navigateToApp={coreStart.application.navigateToApp} />
      </EuiPageSideBar>
      <Route path="/" exact render={() => <Redirect to="/home" />} />
      <Route path="/home" exact component={Home} />
      <Route path="/page-a" component={PageA} />
    </EuiPage>
  </Router>
);

export const renderApp = (coreStart: CoreStart, { history, element }: AppMountParameters) => {
  ReactDOM.render(<FooApp history={history} coreStart={coreStart} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
