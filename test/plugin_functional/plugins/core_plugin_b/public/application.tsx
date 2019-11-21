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
  <EuiPageBody data-test-subj="barAppHome">
    <EuiPageHeader>
      <EuiPageHeaderSection>
        <EuiTitle size="l">
          <h1>Welcome to Bar!</h1>
        </EuiTitle>
      </EuiPageHeaderSection>
    </EuiPageHeader>
    <EuiPageContent>
      <EuiPageContentHeader>
        <EuiPageContentHeaderSection>
          <EuiTitle>
            <h2>Bar home page sction</h2>
          </EuiTitle>
        </EuiPageContentHeaderSection>
      </EuiPageContentHeader>
      <EuiPageContentBody>It feels so homey!</EuiPageContentBody>
    </EuiPageContent>
  </EuiPageBody>
);

const PageB = ({ location }: RouteComponentProps) => {
  const searchParams: any[] = [];
  new URLSearchParams(location.search).forEach((value, key) => searchParams.push([key, value]));

  return (
    <EuiPageBody data-test-subj="barAppPageB">
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>Page B</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle>
              <h2>
                Search params:{' '}
                <span data-test-subj="barAppPageBQuery">{JSON.stringify(searchParams)}</span>
              </h2>
            </EuiTitle>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>
      </EuiPageContent>
    </EuiPageBody>
  );
};

type NavProps = RouteComponentProps & {
  navigateToApp: AppMountContext['core']['application']['navigateToApp'];
};
const Nav = withRouter(({ history, navigateToApp }: NavProps) => (
  <EuiSideNav
    items={[
      {
        name: 'Bar',
        id: 'bar',
        items: [
          {
            id: 'home',
            name: 'Home',
            onClick: () => navigateToApp('bar', { path: '/' }),
            'data-test-subj': 'barNavHome',
          },
          {
            id: 'page-b',
            name: 'Page B',
            onClick: () => history.push('/page-b', { bar: 'page-b' }),
            'data-test-subj': 'barNavPageB',
          },
          {
            id: 'linktofoo',
            name: 'Open Foo',
            onClick: () => navigateToApp('foo'),
            'data-test-subj': 'barNavFooHome',
          },
        ],
      },
    ]}
  />
));

const BarApp = ({ basename, context }: { basename: string; context: AppMountContext }) => (
  <Router basename={basename}>
    <EuiPage>
      <EuiPageSideBar>
        <Nav navigateToApp={context.core.application.navigateToApp} />
      </EuiPageSideBar>
      <Route path="/" exact component={Home} />
      <Route path="/page-b" component={PageB} />
    </EuiPage>
  </Router>
);

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<BarApp basename={appBasePath} context={context} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
