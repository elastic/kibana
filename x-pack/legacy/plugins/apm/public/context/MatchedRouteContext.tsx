/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { matchPath } from 'react-router-dom';
import { routes } from '../components/app/Main/route_config';
import { useLocation } from '../hooks/useLocation';

export const MatchedRouteContext = React.createContext<Array<typeof routes[0]>>(
  []
);

export const MatchedRouteProvider: React.FC = ({ children }) => {
  const { pathname } = useLocation();

  const contextValue = useMemo(() => {
    return routes.filter(route => {
      return matchPath(pathname, {
        path: route.path
      });
    });
  }, [pathname]);

  return (
    <MatchedRouteContext.Provider value={contextValue} children={children} />
  );
};
