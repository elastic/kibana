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
  EuiPageSideBar,
  // @ts-ignore
  EuiSideNav,
} from '@elastic/eui';

import { EmbeddablePanel } from '../../../../../src/plugins/embeddable/public';
import { SavedObjectFinder } from '../../../../../src/plugins/kibana_react/public';
import { AppMountContext, AppMountParameters } from '../../../../../src/core/public';
import { Page } from './page';

const Home = () => <div>hi</div>;

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
          name: 'EQL Search explorer',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

const buildPage = (page: PageDef) => <Page title={page.title}>{page.component}</Page>;

// const SearchApp = ({ basename, context }: { basename: string; context: AppMountContext }) => {
//   const pages: PageDef[] = [
//     {
//       id: 'home',
//       title: 'Home',
//       component: <Home />,
//     },
//     {
//       title: 'Dashboard example',
//       id: 'eqlDashboard',
//       component: <EmbeddablePanel embeddable={} />,
//     },
//   ];

//   const routes = pages.map((page, i) => (
//     <Route key={i} path={`/${page.id}`} render={props => buildPage(page)} />
//   ));

//   return (
//     <Router basename={basename}>
//       <EuiPage>
//         <EuiPageSideBar>
//           <Nav navigateToApp={context.core.application.navigateToApp} pages={pages} />
//         </EuiPageSideBar>
//         <Route path="/" exact component={Home} />
//         {routes}
//       </EuiPage>
//     </Router>
//   );
// };

export const renderApp = (
  context: AppMountContext,
  { appBasePath, element }: AppMountParameters
) => {
  const dashboardFactory = context.embeddable!.getEmbeddableFactory('dashboard');
  dashboardFactory.create({ id: 'eql-dash' }).then(dashboard => {
    if (dashboard) {
      ReactDOM.render(
        <EmbeddablePanel
          embeddable={dashboard}
          getAllEmbeddableFactories={context.embeddable!.getEmbeddableFactories}
          getEmbeddableFactory={context.embeddable!.getEmbeddableFactory}
          getActions={context.uiActions!.getTriggerCompatibleActions}
          {...context.embeddable}
          overlays={context.core.overlays}
          notifications={context.core.notifications}
          inspector={context.inspector!}
          SavedObjectFinder={SavedObjectFinder}
        />,
        element
      );
    }
  });

  return () => ReactDOM.unmountComponentAtNode(element);
};
