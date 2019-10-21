/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { SiemPageName } from '../../pages/home/types';
import { HostsTableType } from '../../store/hosts/model';
import {
  RedirectToCreateRulePage,
  RedirectToDetectionEnginePage,
  RedirectToEditRulePage,
  RedirectToRuleDetailsPage,
  RedirectToRulesPage,
} from './redirect_to_detection_engine';
import { RedirectToHostsPage, RedirectToHostDetailsPage } from './redirect_to_hosts';
import { RedirectToNetworkPage } from './redirect_to_network';
import { RedirectToOverviewPage } from './redirect_to_overview';
import { RedirectToTimelinesPage } from './redirect_to_timelines';

interface LinkToPageProps {
  match: RouteMatch<{}>;
}

export const LinkToPage = pure<LinkToPageProps>(({ match }) => (
  <Switch>
    <Route
      path={`${match.url}/:pageName(${SiemPageName.overview})`}
      component={RedirectToOverviewPage}
    />
    <Route
      exact
      path={`${match.url}/:pageName(${SiemPageName.hosts})`}
      component={RedirectToHostsPage}
    />
    <Route
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:tabName(${HostsTableType.hosts}|${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
      component={RedirectToHostsPage}
      path={`${match.url}/:pageName(hosts)/:tabName(${HostsTableType.hosts}|${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
    />
    <Route
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:detailName/:tabName(${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
      component={RedirectToHostDetailsPage}
      path={`${match.url}/:pageName(hosts)/:detailName/:tabName(${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
    />
    <Route
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:detailName`}
      component={RedirectToHostDetailsPage}
      path={`${match.url}/:pageName(hosts)/:detailName`}
    />

    <Route
      exact
      path={`${match.url}/:pageName(${SiemPageName.network})`}
      component={RedirectToNetworkPage}
      path={`${match.url}/:pageName(network)/ip/:detailName`}
    />
    <Route
      component={RedirectToDetectionEnginePage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.detectionEngine})`}
      strict
    />
    <Route
      component={RedirectToRulesPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.detectionEngine})/rules`}
    />
    <Route
      component={RedirectToCreateRulePage}
      path={`${match.url}/:pageName(${SiemPageName.detectionEngine})/rules/create-rule`}
    />
    <Route
      component={RedirectToRuleDetailsPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.detectionEngine})/rules/rule-details`}
    />
    <Route
      component={RedirectToEditRulePage}
      path={`${match.url}/:pageName(${SiemPageName.detectionEngine})/rules/rule-details/edit-rule`}
    />
    <Route
      path={`${match.url}/:pageName(${SiemPageName.network})/ip/:detailName`}
      component={RedirectToNetworkPage}
    />
    <Route
      path={`${match.url}/:pageName(${SiemPageName.timelines})`}
      component={RedirectToTimelinesPage}
    />
    <Redirect to="/" />
  </Switch>
));

LinkToPage.displayName = 'LinkToPage';
