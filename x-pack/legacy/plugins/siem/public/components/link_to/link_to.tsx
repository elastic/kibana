/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { RedirectToHostsPage, RedirectToHostDetailsPage } from './redirect_to_hosts';
import { RedirectToNetworkPage } from './redirect_to_network';
import { RedirectToOverviewPage } from './redirect_to_overview';
import { RedirectToTimelinesPage } from './redirect_to_timelines';
import {
  RedirectToCreateRulePage,
  RedirectToDetectionEnginePage,
  RedirectToEditRulePage,
  RedirectToRuleDetailsPage,
  RedirectToRulesPage,
} from './redirect_to_detection_engine';
import { HostsTableType } from '../../store/hosts/model';

interface LinkToPageProps {
  match: RouteMatch<{}>;
}

export const LinkToPage = pure<LinkToPageProps>(({ match }) => (
  <Switch>
    <Route path={`${match.url}/:pageName(overview)`} component={RedirectToOverviewPage} />
    <Route exact path={`${match.url}/:pageName(hosts)`} component={RedirectToHostsPage} />
    <Route
      path={`${match.url}/:pageName(hosts)/:tabName(${HostsTableType.hosts}|${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
      component={RedirectToHostsPage}
    />
    <Route
      path={`${match.url}/:pageName(hosts)/:detailName/:tabName(${HostsTableType.authentications}|${HostsTableType.uncommonProcesses}|${HostsTableType.anomalies}|${HostsTableType.events})`}
      component={RedirectToHostDetailsPage}
    />
    <Route
      path={`${match.url}/:pageName(hosts)/:detailName`}
      component={RedirectToHostDetailsPage}
    />

    <Route exact path={`${match.url}/:pageName(network)`} component={RedirectToNetworkPage} />
    <Route
      path={`${match.url}/:pageName(network)/ip/:detailName`}
      component={RedirectToNetworkPage}
    />
    <Route
      path={`${match.url}/:pageName(detection-engine)`}
      component={RedirectToDetectionEnginePage}
    />
    <Route
      path={`${match.url}/:pageName(detection-engine)/rules`}
      component={RedirectToRulesPage}
    />
    <Route
      path={`${match.url}/:pageName(detection-engine)/rules/create-rule`}
      component={RedirectToCreateRulePage}
    />
    <Route
      path={`${match.url}/:pageName(detection-engine)/rules/rule-details`}
      component={RedirectToRuleDetailsPage}
    />
    <Route
      path={`${match.url}/:pageName(detection-engine)/rules/rule-details/edit-rule`}
      component={RedirectToEditRulePage}
    />
    <Route path={`${match.url}/:pageName(timelines)`} component={RedirectToTimelinesPage} />
    <Redirect to="/" />
  </Switch>
));

LinkToPage.displayName = 'LinkToPage';
