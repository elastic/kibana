/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { HostDetails } from './details';
import { HostsTableType } from '../../store/hosts/model';

import { GlobalTime } from '../../containers/global_time';
import { SiemPageName } from '../home/types';
import { Hosts } from './hosts';
import { hostsPagePath, hostDetailsPagePath } from './types';

const getHostsTabPath = (pagePath: string) =>
  `${pagePath}/:tabName(` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.alerts})`;

const getHostDetailsTabPath = (pagePath: string) =>
  `${hostDetailsPagePath}/:tabName(` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events}|` +
  `${HostsTableType.alerts})`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const HostsContainer = React.memo<Props>(({ url }) => (
  <GlobalTime>
    {({ to, from, setQuery, deleteQuery, isInitializing }) => (
      <Switch>
        <Route
          strict
          exact
          path={getHostsTabPath(hostsPagePath)}
          render={() => (
            <Hosts
              hostsPagePath={hostsPagePath}
              from={from}
              to={to}
              setQuery={setQuery}
              isInitializing={isInitializing}
              deleteQuery={deleteQuery}
            />
          )}
        />
        <Route
          strict
          path={getHostDetailsTabPath(hostsPagePath)}
          render={props => (
            <HostDetails
              hostDetailsPagePath={hostDetailsPagePath}
              detailName={props.match.params.detailName}
              from={from}
              to={to}
              setQuery={setQuery}
              isInitializing={isInitializing}
              deleteQuery={deleteQuery}
            />
          )}
        />
        <Route
          path={hostDetailsPagePath}
          render={({
            match: {
              params: { detailName },
            },
            location: { search = '' },
          }) => <Redirect to={`${url}/${detailName}/${HostsTableType.authentications}${search}`} />}
        />
        <Route
          path={`${hostsPagePath}/`}
          render={({ location: { search = '' } }) => (
            <Redirect to={`/${SiemPageName.hosts}/${HostsTableType.hosts}${search}`} />
          )}
        />
      </Switch>
    )}
  </GlobalTime>
));

HostsContainer.displayName = 'HostsContainer';
