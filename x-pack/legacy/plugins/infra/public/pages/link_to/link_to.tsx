/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';

import { Source } from '../../containers/source';
import { RedirectToLogs } from './redirect_to_logs';
import { RedirectToNodeDetail } from './redirect_to_node_detail';
import { RedirectToNodeLogs } from './redirect_to_node_logs';

interface LinkToPageProps {
  match: RouteMatch<{}>;
}

export class LinkToPage extends React.Component<LinkToPageProps> {
  public render() {
    const { match } = this.props;

    return (
      <Source.Provider sourceId="default">
        <Switch>
          <Route
            path={`${match.url}/:nodeType(host|container|pod)-logs/:nodeId`}
            component={RedirectToNodeLogs}
          />
          <Route
            path={`${match.url}/:nodeType(host|container|pod)-detail/:nodeId`}
            component={RedirectToNodeDetail}
          />
          <Route path={`${match.url}/logs`} component={RedirectToLogs} />
          <Redirect to="/infrastructure" />
        </Switch>
      </Source.Provider>
    );
  }
}
