/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { HashRouter, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';
import { I18nContext } from 'ui/i18n';

import { IUiSettingsClient, ChromeStart } from 'src/core/public';
import { ChromeBreadcrumb } from 'kibana/public';
import { IndexPatternsContract, TimefilterSetup } from 'src/plugins/data/public';
import { MlContext, MlContextValue } from '../contexts/ml';
import { useDependencyCache } from '../util/dependency_cache';
import { UiContext } from '../contexts/ui';

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
  chrome: ChromeStart;
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
  const deps: PageDependencies = {
    indexPatterns: services.data.indexPatterns,
    timefilter: services.data.query.timefilter,
    config: services.uiSettings!,
    chrome: services.chrome!,
  };
  const ui = {
    chrome: deps.chrome,
    timefilter: deps.timefilter.timefilter,
    timeHistory: deps.timefilter.history,
    uiSettings: deps.config,
  };

  useDependencyCache(deps);
  // is UiContext needed? uiSettingsContext inherit from kibanaContext?
  return (
    <UiContext.Provider value={ui}>
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
                return route.render(props, deps);
              }}
            />
          ))}
        </div>
      </HashRouter>
    </UiContext.Provider>
  );
};
