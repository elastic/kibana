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

import { EuiPage, EuiPageSideBar, EuiSideNav } from '@elastic/eui';

import { AppMountContext, AppMountParameters } from 'kibana/public';
import { SearchTest } from './es_strategy';
import { Page } from './page';
import { DemoStrategy } from './demo_strategy';
import { DocumentationPage } from './documentation';
import { SearchApiPage } from './search_api';
import { TimeChunkSearchStrategy } from './time_chunk_es_strategy';

const Home = () => <DocumentationPage />;

interface PageDef {
  title: string;
  id: string;
  component: React.ReactNode;
}

type NavProps = RouteComponentProps & {
  navigateToApp: AppMountContext['core']['application']['navigateToApp'];
  pages: PageDef[];
};

const Nav = withRouter(({ history, navigateToApp, pages }: NavProps) => {
  const navItems = pages.map(page => ({
    id: page.id,
    name: page.title,
    onClick: () => history.push(`/${page.id}`),
    'data-test-subj': page.id,
  }));

  return (
    <EuiSideNav
      items={[
        {
          name: 'Data plugin explorer',
          id: 'home',
          items: [
            {
              id: 'home',
              name: 'Home',
              onClick: () => navigateToApp('dataPluginExplorer', { path: '/' }),
              'data-test-subj': 'dataPluginExplorer',
            },
            ...navItems,
          ],
        },
      ]}
    />
  );
});

const buildPage = (page: PageDef) => <Page title={page.title}>{page.component}</Page>;

const SearchApp = ({ basename, context }: { basename: string; context: AppMountContext }) => {
  const pages: PageDef[] = [
    {
      title: 'Search API',
      id: 'searchAPI',
      component: <SearchApiPage />,
    },
    {
      title: 'ES search strategy',
      id: 'defaultSearch',
      component: <SearchTest search={context.search!.search} />,
    },
    {
      title: 'Demo progress strategy',
      id: 'fakeSearch',
      component: <DemoStrategy search={context.search!.search} />,
    },
    {
      title: 'Time chunk es progress strategy',
      id: 'timeChunkStrategy',
      component: <TimeChunkSearchStrategy search={context.search!.search} />,
    },
  ];

  const routes = pages.map(page => (
    <Route path={`/${page.id}`} render={props => buildPage(page)} />
  ));

  return (
    <Router basename={basename}>
      <EuiPage>
        <EuiPageSideBar>
          <Nav navigateToApp={context.core.application.navigateToApp} pages={pages} />
        </EuiPageSideBar>
        <Route path="/" exact component={Home} />
        {routes}
      </EuiPage>
    </Router>
  );
};

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(<SearchApp basename={appBasePath} context={context} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
