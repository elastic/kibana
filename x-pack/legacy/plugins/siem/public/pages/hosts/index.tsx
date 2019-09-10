/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch, RouteComponentProps } from 'react-router-dom';

import { HostDetailsBody, HostDetails } from './details';
import {
  HostsQueryTabBody,
  AuthenticationsQueryTabBody,
  UncommonProcessTabBody,
  AnomaliesTabBody,
  EventsTabBody,
} from './hosts_navigations';
import { HostsBody } from './hosts_body';
import { HostsTableType } from '../../store/hosts/model';
import { GlobalTime } from '../../containers/global_time';
import { Hosts } from './hosts';

const hostsPagePath = `/:pageName(hosts)`;

const getHostsTabPath = (pagePath: string) =>
  `${pagePath}/:tabName(` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events})`;

const getHostDetailsTabPath = (pagePath: string) =>
  `${pagePath}/:detailName/:tabName(` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events})`;

type Props = Partial<RouteComponentProps<{}>> & { url: string };

export const HostsContainer = React.memo<Props>(({ url }) => (
  <GlobalTime>
    {({ to, from, setQuery, isInitializing }) => (
      <Switch>
        <Route
          strict
          exact
          path={hostsPagePath}
          render={() => (
            <Route
              path={hostsPagePath}
              render={() => (
                <>
                  <Hosts from={from} to={to} setQuery={setQuery} isInitializing={isInitializing} />
                  <HostsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={HostsQueryTabBody}
                  />
                </>
              )}
            />
          )}
        />
        <Route
          strict
          exact
          path={getHostsTabPath(hostsPagePath)}
          render={() => (
            <>
              <Hosts from={from} to={to} setQuery={setQuery} isInitializing={isInitializing} />
              <Route
                path={`${hostsPagePath}/:tabName(${HostsTableType.hosts})`}
                render={() => (
                  <HostsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={HostsQueryTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:tabName(${HostsTableType.authentications})`}
                render={() => (
                  <HostsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={AuthenticationsQueryTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}
                render={() => (
                  <HostsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={UncommonProcessTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:tabName(${HostsTableType.anomalies})`}
                render={() => (
                  <HostsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={AnomaliesTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:tabName(${HostsTableType.events})`}
                render={() => (
                  <HostsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={EventsTabBody}
                  />
                )}
              />
            </>
          )}
        />
        <Route
          strict
          exact
          path={getHostDetailsTabPath(hostsPagePath)}
          render={props => (
            <>
              <HostDetails
                from={from}
                to={to}
                setQuery={setQuery}
                isInitializing={isInitializing}
                detailName={props.match.params.detailName}
              />
              <Route
                path={`${hostsPagePath}/:detailName/:tabName(${HostsTableType.hosts})`}
                render={() => (
                  <HostDetailsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={HostsQueryTabBody}
                    detailName={props.match.params.detailName}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:detailName/:tabName(${HostsTableType.authentications})`}
                render={() => (
                  <HostDetailsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    detailName={props.match.params.detailName}
                    children={AuthenticationsQueryTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:detailName/:tabName(${HostsTableType.uncommonProcesses})`}
                render={() => (
                  <HostDetailsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    detailName={props.match.params.detailName}
                    children={UncommonProcessTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:detailName/:tabName(${HostsTableType.anomalies})`}
                render={() => (
                  <HostDetailsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    detailName={props.match.params.detailName}
                    children={AnomaliesTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:detailName/:tabName(${HostsTableType.events})`}
                render={() => (
                  <HostDetailsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    detailName={props.match.params.detailName}
                    children={EventsTabBody}
                  />
                )}
              />
            </>
          )}
        />
        <Route
          path={`${url}/:detailName`}
          render={({ location: { search = '' } }) => (
            <Redirect
              from={`${url}/:detailName`}
              to={`${url}/:detailName/${HostsTableType.authentications}${search}`}
            />
          )}
        />
        <Route
          path="/hosts/"
          render={({ location: { search = '' } }) => (
            <Redirect from={`/hosts/"`} to={`/hosts/${HostsTableType.hosts}${search}`} />
          )}
        />
      </Switch>
    )}
  </GlobalTime>
));

HostsContainer.displayName = 'HostsContainer';
