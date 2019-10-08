/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { IPDetails } from './ip_details';
import { Network } from './network';
import { NetworkTabType } from './types';
import { GlobalTime } from '../../containers/global_time';

type Props = Partial<RouteComponentProps<{}>> & { url: string };

const networkPagePath = `/:pageName(network)`;
const ipDetailsPagePath = `${networkPagePath}/ip/:detailName`;

const getNetworkTabPath = (pagePath: string) =>
  `${pagePath}/:tabName(` +
  `${NetworkTabType.dns}|` +
  `${NetworkTabType.ips}|` +
  `${NetworkTabType.anomalies})`;

export const NetworkContainer = React.memo<Props>(() => (
  <GlobalTime>
    {({ to, from, setQuery, deleteQuery, isInitializing }) => (
      <Switch>
        <Route
          strict
          path={getNetworkTabPath(networkPagePath)}
          render={() => (
            <Network
              networkPagePath={networkPagePath}
              to={to}
              from={from}
              setQuery={setQuery}
              deleteQuery={deleteQuery}
              isInitializing={isInitializing}
            />
          )}
        />
        <Route
          path={ipDetailsPagePath}
          render={({
            match: {
              params: { detailName },
            },
          }) => (
            <IPDetails
              detailName={detailName}
              to={to}
              from={from}
              setQuery={setQuery}
              deleteQuery={deleteQuery}
              isInitializing={isInitializing}
            />
          )}
        />
        <Route
          path="/network/"
          render={({ location: { search = '' } }) => (
            <Redirect from="/network/" to={`/network/${NetworkTabType.dns}${search}`} />
          )}
        />
      </Switch>
    )}
  </GlobalTime>
));

NetworkContainer.displayName = 'NetworkContainer';
