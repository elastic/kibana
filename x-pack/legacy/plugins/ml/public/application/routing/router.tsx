/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { HashRouter, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';

import { IUiSettingsClient, ChromeStart } from 'src/core/public';
import { ChromeBreadcrumb } from 'kibana/public';
import { IndexPatternsContract } from 'src/plugins/data/public';
import { MlContext, MlContextValue } from '../contexts/ml';

import * as routes from './routes';

// custom RouteProps making location non-optional
interface MlRouteProps extends RouteProps {
  location: Location;
}

export interface MlRoute {
  path: string;
  render(props: MlRouteProps, deps: PageDependencies): JSX.Element;
  breadcrumbs: ChromeBreadcrumb[];
}

export interface PageProps {
  location: Location;
  deps: PageDependencies;
}

interface PageDependencies {
  setBreadcrumbs: ChromeStart['setBreadcrumbs'];
  indexPatterns: IndexPatternsContract;
  config: IUiSettingsClient;
}

export const PageLoader: FC<{ context: MlContextValue }> = ({ context, children }) => {
  return context === null ? null : (
    <MlContext.Provider value={context}>{children}</MlContext.Provider>
  );
};

export const MlRouter: FC<{ pageDeps: PageDependencies }> = ({ pageDeps }) => {
  const setBreadcrumbs = pageDeps.setBreadcrumbs;

  return (
    <HashRouter>
      <div>
        {Object.entries(routes).map(([name, route]) => (
          <Route
            key={name}
            path={route.path}
            exact
            render={props => {
              window.setTimeout(() => {
                setBreadcrumbs(route.breadcrumbs);
              });
              return route.render(props, pageDeps);
            }}
          />
        ))}
      </div>
    </HashRouter>
  );
};
