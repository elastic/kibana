/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, withRouter, RouteComponentProps } from 'react-router-dom';

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

import { AppMountContext, AppMountParameters } from 'kibana/public';

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
  navigateToApp: AppMountContext['core']['application']['navigateToApp'];
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
            onClick: () => history.push('/'),
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

const FooApp = ({ basename, context }: { basename: string; context: AppMountContext }) => (
  <Router basename={basename}>
    <EuiPage>
      <EuiPageSideBar>
        <Nav navigateToApp={context.core.application.navigateToApp} />
      </EuiPageSideBar>
      <Route path="/" exact component={Home} />
      <Route path="/page-a" component={PageA} />
    </EuiPage>
  </Router>
);

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<FooApp basename={appBasePath} context={context} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
