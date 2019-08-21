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
import { Hosts, HostsBody } from './hosts';
import { HostsTabName } from './hosts_navigations';

export const HostsContainer = pure<HostComponentProps>(({ match }) => (
  <>
    <Switch>
      <Route
        strict
        exact
        path={match.url}
        render={props => (
          <>
            <PageRoute
              {...props}
              component={Hosts}
              title={i18n.translate('xpack.siem.pages.hosts.hostsTitle', {
                defaultMessage: 'Hosts',
              })}
            />
            <HostsBody {...props} />
          </>
        )}
      />
      <Route
        strict
        exact
        path={`${match.url}/:tabName(|${HostsTabName.hosts}|${HostsTabName.authentications}|${HostsTabName.uncommonProcesses}|${HostsTabName.anomalies}|${HostsTabName.events})`}
        render={props => (
          <>
            <PageRoute
              {...props}
              component={Hosts}
              title={i18n.translate('xpack.siem.pages.hosts.hostsTitle', {
                defaultMessage: 'Hosts',
              })}
            />
            <HostsBody {...props} />
          </>
        )}
      />
      <Route
        strict
        exact
        path={`${match.url}/:hostName`}
        render={props => {
          return (
            <>
              <PageRoute
                {...props}
                component={HostDetails}
                title={i18n.translate('xpack.siem.pages.hosts.hostsTitle', {
                  defaultMessage: 'Hosts',
                })}
              />
              <HostDetailsBody {...props} />
            </>
          );
        }}
      />
      <Route
        strict
        exact
        path={`${match.url}/:hostName/:tabName(${HostsTabName.authentications}|${HostsTabName.uncommonProcesses}|${HostsTabName.anomalies}|${HostsTabName.events})`}
        render={props => (
          <>
            <PageRoute
              {...props}
              component={HostDetails}
              title={i18n.translate('xpack.siem.pages.hosts.hostsTitle', {
                defaultMessage: 'Hosts',
              })}
            />
            <HostDetailsBody {...props} />
          </>
        )}
      />

      <Redirect from="/hosts/" to="/hosts" />
    </Switch>
  </>
));

HostsContainer.displayName = 'HostsContainer';
