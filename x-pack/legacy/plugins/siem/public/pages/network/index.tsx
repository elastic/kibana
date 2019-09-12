/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { IPDetails } from './ip_details';
import { Network } from './network';

const networkPath = `/:pageName(network)`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const NetworkContainer = React.memo<Props>(() => (
  <Switch>
    <Route strict exact path={networkPath} render={() => <Network />} />
    <Route
      path={`${networkPath}/ip/:detailName`}
      render={({
        match: {
          params: { detailName },
        },
      }) => <IPDetails detailName={detailName} />}
    />
    <Route
      path="/network/"
      render={({ location: { search = '' } }) => (
        <Redirect from="/network/" to={`/network${search}`} />
      )}
    />
  </Switch>
));

NetworkContainer.displayName = 'NetworkContainer';
