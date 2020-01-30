/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { HashRouter, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';
import { I18nContext } from 'ui/i18n';

import { IUiSettingsClient } from 'src/core/public';
import { ChromeBreadcrumb } from 'kibana/public';
import { IndexPatternsContract, TimefilterSetup } from 'src/plugins/data/public';
import { MlContext, MlContextValue } from '../contexts/ml';

import * as routes from './routes';
import { useMlKibana } from '../contexts/kibana';

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

export interface PageDependencies {
  config: IUiSettingsClient;
  indexPatterns: IndexPatternsContract;
  timefilter: TimefilterSetup;
}

export const PageLoader: FC<{ context: MlContextValue }> = ({ context, children }) => {
  return context === null ? null : (
    <I18nContext>
      <MlContext.Provider value={context}>{children}</MlContext.Provider>
    </I18nContext>
  );
};

export const MlRouter: FC = () => {
  const { services } = useMlKibana();
  const setBreadcrumbs = services.chrome!.setBreadcrumbs;
  const indexPatterns = services.data.indexPatterns;
  const timefilter = services.data.query.timefilter;
  const config = services.uiSettings!;

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
              return route.render(props, { config, indexPatterns, timefilter });
            }}
          />
        ))}
      </div>
    </HashRouter>
  );
};
