/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Route, Switch } from 'react-router-dom';

interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  routes?: RouteConfig[];
}

export const ChildRoutes: React.FC<{
  routes?: RouteConfig[];
  useSwitch?: boolean;
  [other: string]: any;
}> = ({ routes, useSwitch = true, ...rest }) => {
  if (!routes) {
    return null;
  }
  const Parent = useSwitch ? Switch : React.Fragment;
  return (
    <Parent>
      {routes.map(route => (
        <Route
          key={route.path}
          path={route.path}
          render={routeProps => {
            const Component = route.component;
            return <Component {...routeProps} routes={route.routes} {...rest} />;
          }}
        />
      ))}
    </Parent>
  );
};
