/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, withRouter, RouteComponentProps } from 'react-router-dom';

import {
  EuiPage,
  EuiPageSideBar,
  EuiSideNav,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
} from '@elastic/eui';

import {
  IEmbeddableStart,
  EmbeddableFactoryRenderer,
} from '../../../../../src/plugins/embeddable/public';
import { BackgroundSearchCollection } from '../../../../../x-pack/plugins/advanced_data/public';
import {
  AppMountContext,
  AppMountParameters,
  CoreStart,
  SimpleSavedObject,
} from '../../../../../src/core/public';

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
          name: 'Background searches',
          id: 'home',
          items: [...navItems],
        },
      ]}
    />
  );
});

const BackgroundSearchExplorerApp = ({
  basename,
  navigateToApp,
  embeddableApi,
  backgroundSearches,
}: {
  basename: string;
  navigateToApp: CoreStart['application']['navigateToApp'];
  embeddableApi: IEmbeddableStart;
  backgroundSearches: Array<SimpleSavedObject<BackgroundSearchCollection>>;
}) => {
  const pages: PageDef[] = backgroundSearches.map(search => {
    const parsed = JSON.parse(search.attributes.url) as { type: string; input: any };
    return {
      title: search.attributes.name,
      id: search.id,
      component: (
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentBody>
              <EmbeddableFactoryRenderer
                getEmbeddableFactory={embeddableApi.getEmbeddableFactory}
                type={parsed.type}
                input={parsed.input}
              />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      ),
    };
  });

  const routes = pages.map((page, i) => (
    <Route key={i} path={`/${page.id}`} render={props => page.component} />
  ));

  return (
    <Router basename={basename}>
      <EuiPage>
        <EuiPageSideBar>
          <Nav navigateToApp={navigateToApp} pages={pages} />
        </EuiPageSideBar>
        {routes}
      </EuiPage>
    </Router>
  );
};

export const renderApp = (
  core: CoreStart,
  embeddableApi: IEmbeddableStart,
  backgroundSearchCollections: BackgroundSearchCollection[],
  { appBasePath, element }: AppMountParameters
) => {
  ReactDOM.render(
    <BackgroundSearchExplorerApp
      basename={appBasePath}
      navigateToApp={core.application.navigateToApp}
      embeddableApi={embeddableApi}
      backgroundSearches={backgroundSearchCollections}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
