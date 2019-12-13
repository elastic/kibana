/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { useState, useEffect } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { Loading, ChildRoutes } from './components';
import { useLibs, URLStateProps, WithUrlState } from './hooks';
import { routeMap } from './pages';

function useWaitUntilFrameworkReady() {
  const libs = useLibs();
  const [isLoading, setIsLoading] = useState(true);

  const waitUntilReady = async () => {
    try {
      await libs.framework.waitUntilFrameworkReady();
    } catch (e) {
      // Silently swallow error
    }
    setIsLoading(false);
  };

  useEffect(() => {
    waitUntilReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading };
}

export const AppRoutes: React.FC = () => {
  const { isLoading } = useWaitUntilFrameworkReady();
  const libs = useLibs();

  if (isLoading === true) {
    return <Loading />;
  }

  return (
    <React.Fragment>
      {/* Redirects mapping */}
      <Switch>
        {/* License check (UI displays when license exists but is expired) */}
        {get(libs.framework.info, 'license.expired', true) && (
          <Route
            render={props =>
              !props.location.pathname.includes('/error') ? (
                <Redirect to="/error/invalid_license" />
              ) : null
            }
          />
        )}

        {!libs.framework.capabilities.read && (
          <Route
            render={props =>
              !props.location.pathname.includes('/error') ? (
                <Redirect to="/error/no_access" />
              ) : null
            }
          />
        )}

        {/* Ensure security is eanabled for elastic and kibana */}
        {/* TODO: Disabled for now as we don't have this info set up on backend yet */}
        {/* {!get(this.props.libs.framework.info, 'security.enabled', true) && (
            <Route
              render={props =>
                !props.location.pathname.includes('/error') ? (
                  <Redirect to="/error/enforce_security" />
                ) : null
              }
            />
          )} */}

        {/* This app does not make use of a homepage. The main page is agents list */}
        <Route path="/" exact={true} render={() => <Redirect to="/agents" />} />
      </Switch>

      {/* Render routes from the FS */}
      <WithUrlState>
        {(URLProps: URLStateProps) => <ChildRoutes routes={routeMap} {...URLProps} />}
      </WithUrlState>
    </React.Fragment>
  );
};
