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

const hostsPath = `/:pageName(hosts)`;

export const HostsContainer = pure<HostComponentProps>(({ match }) => (
  <>
    <Switch>
      <Route
        strict
        exact
        path={hostsPath}
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
              path={hostsPath}
              render={() => <HostsBody {...props} children={HostsQueryTabBody} />}
            />
          </>
        )}
      />
      <Route
        strict
        exact
        path={`${hostsPath}/:tabName(${HostsTableType.hosts}|${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
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
              path={`${hostsPath}/:tabName(${HostsTableType.hosts})`}
              render={() => <HostsBody {...props} children={HostsQueryTabBody} />}
            />
            <Route
              path={`${hostsPath}/:tabName(${HostsTableType.authentications})`}
              render={() => <HostsBody {...props} children={AuthenticationsQueryTabBody} />}
            />
            <Route
              path={`${hostsPath}/:tabName(${HostsTableType.uncommonProcesses})`}
              render={() => <HostsBody {...props} children={UncommonProcessTabBody} />}
            />
            <Route
              path={`${hostsPath}/:tabName(${HostsTableType.anomalies})`}
              render={() => <HostsBody {...props} children={AnomaliesTabBody} />}
            />
            <Route
              path={`${hostsPath}/:tabName(${HostsTableType.events})`}
              render={() => <HostsBody {...props} children={EventsTabBody} />}
            />
          </>
        )}
      />
      <Route
        strict
        exact
        path={`${hostsPath}/:hostName/:tabName(${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
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
              path={`${hostsPath}/:hostName/:tabName(${HostsTableType.hosts})`}
              render={() => <HostDetailsBody {...props} children={HostsQueryTabBody} />}
            />
            <Route
              path={`${hostsPath}/:hostName/:tabName(${HostsTableType.authentications})`}
              render={() => <HostDetailsBody {...props} children={AuthenticationsQueryTabBody} />}
            />
            <Route
              path={`${hostsPath}/:hostName/:tabName(${HostsTableType.uncommonProcesses})`}
              render={() => <HostDetailsBody {...props} children={UncommonProcessTabBody} />}
            />
            <Route
              path={`${hostsPath}/:hostName/:tabName(${HostsTableType.anomalies})`}
              render={() => <HostDetailsBody {...props} children={AnomaliesTabBody} />}
            />
            <Route
              path={`${hostsPath}/:hostName/:tabName(${HostsTableType.events})`}
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
