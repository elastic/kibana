/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { Component } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { Loading } from './components/loading';
import { ChildRoutes } from './components/navigation/child_routes';
import { URLStateProps, WithURLState } from './hooks/with_url_state';
import { FrontendLibs } from './lib/types';
import { routeMap } from './pages';

interface RouterProps {
  libs: FrontendLibs;
}
interface RouterState {
  loading: boolean;
}

export class AppRoutes extends Component<RouterProps, RouterState> {
  constructor(props: RouterProps) {
    super(props);
    this.state = {
      loading: true,
    };
  }

  public async componentWillMount() {
    if (this.state.loading === true) {
      try {
        await this.props.libs.framework.waitUntilFrameworkReady();
      } catch (e) {
        // Silently swallow error
      }

      this.setState({
        loading: false,
      });
    }
  }

  public render() {
    if (this.state.loading === true) {
      return <Loading />;
    }

    return (
      <React.Fragment>
        {/* Redirects mapping */}
        <Switch>
          {/* License check (UI displays when license exists but is expired) */}
          {get(this.props.libs.framework.info, 'license.expired', true) && (
            <Route
              render={props =>
                !props.location.pathname.includes('/error') ? (
                  <Redirect to="/error/invalid_license" />
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

          {/* This app does not make use of a homepage. The mainpage is overview/enrolled_agents */}
          {/* <Route path="/" exact={true} render={() => <Redirect to="/overview/enrolled_agents" />} /> */}
        </Switch>

        {/* Render routes from the FS */}
        <WithURLState>
          {(URLProps: URLStateProps) => (
            <ChildRoutes
              routes={routeMap}
              {...URLProps}
              {...{
                libs: this.props.libs,
              }}
            />
          )}
        </WithURLState>
      </React.Fragment>
    );
  }
}
