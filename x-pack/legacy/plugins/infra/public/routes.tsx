/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React from 'react';
import { Redirect, Route, Router, Switch } from 'react-router-dom';

import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { NotFoundPage } from './pages/404';
import { InfrastructurePage } from './pages/infrastructure';
import { LinkToPage } from './pages/link_to';
import { LogsPage } from './pages/logs';
import { MetricDetail } from './pages/metrics';

interface RouterProps {
  history: History;
  uiCapabilities: UICapabilities;
}

const PageRouterComponent: React.SFC<RouterProps> = ({ history, uiCapabilities }) => {
  return (
    <Router history={history}>
      <Switch>
        {uiCapabilities.infrastructure.show && (
          <Redirect from="/" exact={true} to="/infrastructure/inventory" />
        )}
        {uiCapabilities.infrastructure.show && (
          <Redirect from="/infrastructure" exact={true} to="/infrastructure/inventory" />
        )}
        {uiCapabilities.infrastructure.show && (
          <Redirect from="/infrastructure/snapshot" exact={true} to="/infrastructure/inventory" />
        )}
        {uiCapabilities.infrastructure.show && (
          <Redirect from="/home" exact={true} to="/infrastructure/inventory" />
        )}
        {uiCapabilities.logs.show && <Route path="/logs" component={LogsPage} />}
        {uiCapabilities.infrastructure.show && (
          <Route path="/infrastructure" component={InfrastructurePage} />
        )}
        <Route path="/link-to" component={LinkToPage} />
        {uiCapabilities.infrastructure.show && (
          <Route path="/metrics/:type/:node" component={MetricDetail} />
        )}
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
};

export const PageRouter = injectUICapabilities(PageRouterComponent);
