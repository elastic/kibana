/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Redirect, RouteProps } from 'react-router-dom';

// This workaround preserves query parameters in the redirect
// https://github.com/ReactTraining/react-router/issues/5818#issuecomment-379212014
export const RedirectWithQueryParams: React.FunctionComponent<{
  from: string;
  to: string;
  exact?: boolean;
}> = ({ from, to, exact }) => (
  <Route
    path={from}
    render={({ location }: RouteProps) =>
      location ? (
        <Redirect
          from={from}
          exact={exact}
          to={{
            ...location,
            pathname: location.pathname.replace(from, to),
          }}
        />
      ) : null
    }
  />
);
