/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { match as RouteMatch, Redirect, Route, Switch } from 'react-router-dom';
import { pure } from 'recompose';

import { RedirectToHostsPage } from './redirect_to_hosts';
import { RedirectToNetworkPage } from './redirect_to_network';
import { RedirectToOverviewPage } from './redirect_to_overview';
import { RedirectToTimelinesPage } from './redirect_to_timelines';

interface LinkToPageProps {
  match: RouteMatch<{}>;
}

export const LinkToPage = pure<LinkToPageProps>(({ match }) => (
  <Switch>
    <Route path={`${match.url}/overview`} component={RedirectToOverviewPage} />
    <Route exact path={`${match.url}/hosts`} component={RedirectToHostsPage} />
    <Route path={`${match.url}/hosts/:hostName`} component={RedirectToHostsPage} />
    <Route exact path={`${match.url}/network`} component={RedirectToNetworkPage} />
    <Route path={`${match.url}/network/ip/:ip`} component={RedirectToNetworkPage} />
    <Route path={`${match.url}/timelines`} component={RedirectToTimelinesPage} />
    <Redirect to="/" />
  </Switch>
));
