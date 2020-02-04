/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, ReactChild } from 'react';
import { matchPath, match } from 'react-router-dom';
import { useLocation } from '../hooks/useLocation';
import {
  BreadcrumbRoute,
  LocationMatch
} from '../components/app/Main/ProvideBreadcrumbs';

export const MatchedRouteContext = React.createContext<{
  routes: BreadcrumbRoute[];
  matchPath?: LocationMatch['match'];
}>({ routes: [] });

interface MatchedRouteProviderProps {
  children: ReactChild;
  routes: BreadcrumbRoute[];
}
export function MatchedRouteProvider({
  children,
  routes
}: MatchedRouteProviderProps) {
  const { pathname } = useLocation();

  const contextValue = useMemo(() => {
    let matchedPath: LocationMatch['match'] | undefined;
    const routesFound = routes.filter(route => {
      const path: match<{}> | null = matchPath(pathname, {
        path: route.path,
        exact: true
      });
      if (path) {
        matchedPath = path;
      }
      return path;
    });
    return { routes: routesFound, matchPath: matchedPath };
  }, [pathname, routes]);

  return (
    <MatchedRouteContext.Provider value={contextValue} children={children} />
  );
}
