/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { HashRouter, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';
import { I18nContext } from 'ui/i18n';

import { IndexPatterns } from 'ui/index_patterns';
import { KibanaContext, KibanaConfigTypeFix, KibanaContextValue } from '../contexts/kibana';
import { ChromeBreadcrumb } from '../../../../../../../src/core/public';

import * as routes from './routes';

// custom RouteProps making location non-optional
interface MlRouteProps extends RouteProps {
  location: Location;
}

export interface MlRoute {
  path: string;
  render(props: MlRouteProps, config: KibanaConfigTypeFix, deps: PageDependencies): JSX.Element;
  breadcrumbs: ChromeBreadcrumb[];
}

export interface PageProps {
  location: Location;
  config: KibanaConfigTypeFix;
  deps: PageDependencies;
}

export interface PageDependencies {
  indexPatterns: IndexPatterns;
}

export const PageLoader: FC<{ context: KibanaContextValue }> = ({ context, children }) => {
  return context === null ? null : (
    <I18nContext>
      <KibanaContext.Provider value={context}>{children}</KibanaContext.Provider>
    </I18nContext>
  );
};

export const MlRouter: FC<{
  config: KibanaConfigTypeFix;
  setBreadCrumbs: any;
  indexPatterns: IndexPatterns;
}> = ({ config, setBreadCrumbs, indexPatterns }) => {
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
                setBreadCrumbs(route.breadcrumbs);
              });
              return route.render(props, config, { indexPatterns });
            }}
          />
        ))}
      </div>
    </HashRouter>
  );
};
