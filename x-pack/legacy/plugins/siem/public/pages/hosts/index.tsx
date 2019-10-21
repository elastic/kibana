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
  UncommonProcessQueryTabBody,
  AnomaliesQueryTabBody,
  EventsQueryTabBody,
} from './navigation';
import { HostsBody } from './hosts_body';
import { HostsTableType } from '../../store/hosts/model';
import { GlobalTime } from '../../containers/global_time';
import { SiemPageName } from '../home/types';
import { Hosts } from './hosts';

const hostsPagePath = `/:pageName(${SiemPageName.hosts})`;

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
    {({ to, from, setQuery, deleteQuery, isInitializing }) => (
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
                    deleteQuery={deleteQuery}
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
                    deleteQuery={deleteQuery}
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
                    deleteQuery={deleteQuery}
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
                    deleteQuery={deleteQuery}
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={UncommonProcessQueryTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:tabName(${HostsTableType.anomalies})`}
                render={() => (
                  <HostsBody
                    deleteQuery={deleteQuery}
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={AnomaliesQueryTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:tabName(${HostsTableType.events})`}
                render={() => (
                  <HostsBody
                    deleteQuery={deleteQuery}
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    children={EventsQueryTabBody}
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
                    deleteQuery={deleteQuery}
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
                    deleteQuery={deleteQuery}
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
                    deleteQuery={deleteQuery}
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    detailName={props.match.params.detailName}
                    children={UncommonProcessQueryTabBody}
                  />
                )}
              />
              <Route
                path={`${hostsPagePath}/:detailName/:tabName(${HostsTableType.anomalies})`}
                render={() => (
                  <HostDetailsBody
                    deleteQuery={deleteQuery}
                    from={from}
                    to={to}
                    setQuery={setQuery}
                    isInitializing={isInitializing}
                    detailName={props.match.params.detailName}
                    children={AnomaliesQueryTabBody}
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
                    children={EventsQueryTabBody}
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
          path={`/${SiemPageName.hosts}/`}
          render={({ location: { search = '' } }) => (
            <Redirect
              from={`/${SiemPageName.hosts}/"`}
              to={`/${SiemPageName.hosts}/${HostsTableType.hosts}${search}`}
            />
          )}
        />
      </Switch>
    )}
  </GlobalTime>
));

HostsContainer.displayName = 'HostsContainer';
