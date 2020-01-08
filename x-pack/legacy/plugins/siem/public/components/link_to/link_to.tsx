/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';

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

export const LinkToPage = React.memo<LinkToPageProps>(({ match }) => (
  <Switch>
    <Route
      component={RedirectToOverviewPage}
      path={`${match.url}/:pageName(${SiemPageName.overview})`}
    />
    <Route
      component={RedirectToHostsPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.hosts})`}
    />
    <Route
      component={RedirectToHostsPage}
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:tabName(${HostsTableType.hosts}|${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
    />
    <Route
      component={RedirectToHostDetailsPage}
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:detailName/:tabName(${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
    />
    <Route
      component={RedirectToHostDetailsPage}
      path={`${match.url}/:pageName(${SiemPageName.hosts})/:detailName`}
    />
    <Route
      component={RedirectToNetworkPage}
      exact
      path={`${match.url}/:pageName(${SiemPageName.network})`}
    />
    <Route
      component={RedirectToNetworkPage}
      path={`${match.url}/:pageName(${SiemPageName.network})/ip/:detailName`}
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
      component={RedirectToTimelinesPage}
      path={`${match.url}/:pageName(${SiemPageName.timelines})`}
    />
    <Redirect to="/" />
  </Switch>
));

LinkToPage.displayName = 'LinkToPage';
