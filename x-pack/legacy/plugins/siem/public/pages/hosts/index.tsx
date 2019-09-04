/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { HostComponentProps } from '../../components/link_to/redirect_to_hosts';

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

export const HostsContainer = pure<HostComponentProps>(({ match }) => (
  <GlobalTime>
    {({ to, from, setQuery, isInitializing }) => (
      <Switch>
        <Route
          strict
          exact
          path={hostsPagePath}
          render={props => (
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
                    {...props}
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
          render={props => (
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
                    {...props}
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
                    {...props}
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
                    {...props}
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
                    {...props}
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
                    {...props}
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
                {...props}
              />
              <Route
                path={`${hostsPagePath}/:detailName/:tabName(${HostsTableType.hosts})`}
                render={() => (
                  <HostDetailsBody
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    {...props}
                    children={HostsQueryTabBody}
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
                    {...props}
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
                    {...props}
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
                    {...props}
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
                    {...props}
                    children={EventsTabBody}
                  />
                )}
              />
            </>
          )}
        />
        <Redirect
          from={`${match.url}/:detailName`}
          to={`${match.url}/:detailName/${HostsTableType.authentications}`}
        />
        <Redirect from="/hosts/" to={`/hosts/${HostsTableType.hosts}`} />
      </Switch>
    )}
  </GlobalTime>
));

HostsContainer.displayName = 'HostsContainer';
