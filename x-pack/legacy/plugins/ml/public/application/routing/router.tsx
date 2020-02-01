/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { HashRouter, Route, RouteProps } from 'react-router-dom';
import { Location } from 'history';

import { IUiSettingsClient, ChromeStart } from 'src/core/public';
import {
  ChromeBreadcrumb,
  DocLinksStart,
  ToastsStart,
  OverlayStart,
  ChromeRecentlyAccessed,
} from 'kibana/public';
import {
  IndexPatternsContract,
  TimefilterSetup,
  FieldFormatsStart,
  DataPublicPluginStart,
} from 'src/plugins/data/public';
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

export interface PageDependencies {
  config: IUiSettingsClient;
  indexPatterns: IndexPatternsContract;
  timefilter: TimefilterSetup;
  chrome: ChromeStart;
  docLinks: DocLinksStart;
  toastNotifications: ToastsStart;
  overlays: OverlayStart;
  recentlyAccessed: ChromeRecentlyAccessed;
  fieldFormats: FieldFormatsStart;
  autocomplete: DataPublicPluginStart['autocomplete'];
}

export const PageLoader: FC<{ context: MlContextValue }> = ({ context, children }) => {
  return context === null ? null : (
    <MlContext.Provider value={context}>{children}</MlContext.Provider>
  );
};

export const MlRouter: FC<{ pageDeps: PageDependencies }> = ({ pageDeps }) => {
  const setBreadcrumbs = pageDeps.chrome.setBreadcrumbs;

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
