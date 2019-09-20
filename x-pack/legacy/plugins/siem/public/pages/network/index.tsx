/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { IPDetails, IPDetailsBody } from './ip_details';
import { GlobalTime } from '../../containers/global_time';
import { IpDetailsTableType } from '../../store/network/model';
import { Network } from './network';
import { AnomaliesQueryTabBody, TlsQueryTabBody, UsersQueryTabBody } from './navigation';

const networkPagePath = `/:pageName(network)`;
const ipDetailsPagePath = networkPagePath + '/ip/:detailName';

type Props = Partial<RouteComponentProps<{}>> & { url: string };

const getIPDetailsTabPath = (pagePath: string) =>
  `${pagePath}/ip/:detailName/:tabName(` +
  `${IpDetailsTableType.tls}|` +
  `${IpDetailsTableType.users}|` +
  `${IpDetailsTableType.anomalies})`;

export const NetworkContainer = React.memo<Props>(() => (
  <GlobalTime>
    {({ to, from, setQuery, deleteQuery, isInitializing }) => (
      <Switch>
        <Route strict exact path={networkPagePath} render={() => <Network />} />
        <Route
          strict
          exact
          path={getIPDetailsTabPath(networkPagePath)}
          render={props => {
            const commonProps = {
              deleteQuery,
              from,
              to,
              setQuery,
              isInitializing,
              detailName: props.match.params.detailName,
            };

            return (
              <>
                <IPDetails {...commonProps} />
                <Route
                  path={`${ipDetailsPagePath}/:tabName(${IpDetailsTableType.tls})`}
                  render={() => <IPDetailsBody {...commonProps} children={TlsQueryTabBody} />}
                />
                <Route
                  path={`${ipDetailsPagePath}/:tabName(${IpDetailsTableType.users})`}
                  render={() => <IPDetailsBody {...commonProps} children={UsersQueryTabBody} />}
                />
                <Route
                  path={`${ipDetailsPagePath}/:tabName(${IpDetailsTableType.anomalies})`}
                  render={() => <IPDetailsBody {...commonProps} children={AnomaliesQueryTabBody} />}
                />
              </>
            );
          }}
        />
        <Route
          path={`${networkPagePath}/ip/:detailName`}
          render={({ location: { search = '', pathname } }) => (
            <Redirect to={`${pathname}/${IpDetailsTableType.tls}${search}`} />
          )}
        />
        <Route
          path="/network/"
          render={({ location: { search = '' } }) => <Redirect to={`/network${search}`} />}
        />
      </Switch>
    )}
  </GlobalTime>
));

NetworkContainer.displayName = 'NetworkContainer';
