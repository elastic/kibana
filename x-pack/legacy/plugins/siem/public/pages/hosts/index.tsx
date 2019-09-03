/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';
import { i18n } from '@kbn/i18n';
import { PageRoute } from '../../components/page_route/pageroute';

import { HostComponentProps } from '../../components/link_to/redirect_to_hosts';

import { HostDetails, HostDetailsBody } from './host_details';
import { Hosts } from './hosts';
import {
  HostsQueryTabBody,
  AuthenticationsQueryTabBody,
  UncommonProcessTabBody,
  AnomaliesTabBody,
  EventsTabBody,
} from './hosts_navigations';
import { HostsBody } from './hosts_body';
import { HostsTableType } from '../../store/hosts/model';

const hostsPagePath = `/:pageName(hosts)`;

const getHostsTabPath = (pagePath: string) =>
  `${pagePath}/:tabName(` +
  `${HostsTableType.hosts}|` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events})`;

const getHostDetailsTabPath = (pagePath: string) =>
  `${pagePath}/:hostName/:tabName(` +
  `${HostsTableType.authentications}|` +
  `${HostsTableType.uncommonProcesses}|` +
  `${HostsTableType.anomalies}|` +
  `${HostsTableType.events})`;

export const HostsContainer = pure<HostComponentProps>(({ match }) => (
  <>
    <Switch>
      <Route
        strict
        exact
        path={hostsPagePath}
        render={props => (
          <>
            <PageRoute
              {...props}
              component={Hosts}
              title={i18n.translate('xpack.siem.pages.hosts.hostsTitle', {
                defaultMessage: 'Hosts',
              })}
            />
            <Route
              path={hostsPagePath}
              render={() => <HostsBody {...props} children={HostsQueryTabBody} />}
            />
          </>
        )}
      />
      <Route
        strict
        exact
        path={getHostsTabPath(hostsPagePath)}
        render={props => (
          <>
            <PageRoute
              {...props}
              component={Hosts}
              title={i18n.translate('xpack.siem.pages.hosts.hostsTitle', {
                defaultMessage: 'Hosts',
              })}
            />
            <Route
              path={`${hostsPagePath}/:tabName(${HostsTableType.hosts})`}
              render={() => <HostsBody {...props} children={HostsQueryTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:tabName(${HostsTableType.authentications})`}
              render={() => <HostsBody {...props} children={AuthenticationsQueryTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:tabName(${HostsTableType.uncommonProcesses})`}
              render={() => <HostsBody {...props} children={UncommonProcessTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:tabName(${HostsTableType.anomalies})`}
              render={() => <HostsBody {...props} children={AnomaliesTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:tabName(${HostsTableType.events})`}
              render={() => <HostsBody {...props} children={EventsTabBody} />}
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
            <PageRoute
              {...props}
              component={HostDetails}
              title={i18n.translate('xpack.siem.pages.hosts.hostsTitle', {
                defaultMessage: 'Hosts',
              })}
            />
            <Route
              path={`${hostsPagePath}/:hostName/:tabName(${HostsTableType.hosts})`}
              render={() => <HostDetailsBody {...props} children={HostsQueryTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:hostName/:tabName(${HostsTableType.authentications})`}
              render={() => <HostDetailsBody {...props} children={AuthenticationsQueryTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:hostName/:tabName(${HostsTableType.uncommonProcesses})`}
              render={() => <HostDetailsBody {...props} children={UncommonProcessTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:hostName/:tabName(${HostsTableType.anomalies})`}
              render={() => <HostDetailsBody {...props} children={AnomaliesTabBody} />}
            />
            <Route
              path={`${hostsPagePath}/:hostName/:tabName(${HostsTableType.events})`}
              render={() => <HostDetailsBody {...props} children={EventsTabBody} />}
            />
          </>
        )}
      />
      <Redirect
        from={`${match.url}/:hostName`}
        to={`${match.url}/:hostName/${HostsTableType.authentications}`}
      />
      <Redirect from="/hosts/" to="/hosts" />
    </Switch>
  </>
));

HostsContainer.displayName = 'HostsContainer';
