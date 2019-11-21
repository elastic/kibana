/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';
import React from 'react';
import { Route, Router, Switch } from 'react-router-dom';

import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { NotFoundPage } from './pages/404';
import { InfrastructurePage } from './pages/infrastructure';
import { LinkToPage } from './pages/link_to';
import { LogsPage } from './pages/logs';
import { MetricDetail } from './pages/metrics';
import { RedirectWithQueryParams } from './utils/redirect_with_query_params';

interface RouterProps {
  history: History;
  uiCapabilities: UICapabilities;
}

const PageRouterComponent: React.FC<RouterProps> = ({ history, uiCapabilities }) => {
  return (
    <Router history={history}>
      <Switch>
        {uiCapabilities.infrastructure.show && (
          <RedirectWithQueryParams from="/" exact={true} to="/infrastructure/inventory" />
        )}
        {uiCapabilities.infrastructure.show && (
          <RedirectWithQueryParams
            from="/infrastructure"
            exact={true}
            to="/infrastructure/inventory"
          />
        )}
        {uiCapabilities.infrastructure.show && (
          <RedirectWithQueryParams
            from="/infrastructure/snapshot"
            exact={true}
            to="/infrastructure/inventory"
          />
        )}
        {uiCapabilities.infrastructure.show && (
          <RedirectWithQueryParams from="/home" exact={true} to="/infrastructure/inventory" />
        )}
        {uiCapabilities.infrastructure.show && (
          <Route path="/infrastructure/metrics/:type/:node" component={MetricDetail} />
        )}
        {uiCapabilities.infrastructure.show && (
          <RedirectWithQueryParams from="/metrics" to="/infrastructure/metrics" />
        )}
        {uiCapabilities.logs.show && (
          <RedirectWithQueryParams from="/logs" exact={true} to="/logs/stream" />
        )}
        {uiCapabilities.logs.show && <Route path="/logs" component={LogsPage} />}
        {uiCapabilities.infrastructure.show && (
          <Route path="/infrastructure" component={InfrastructurePage} />
        )}
        <Route path="/link-to" component={LinkToPage} />
        <Route component={NotFoundPage} />
      </Switch>
    </Router>
  );
};

export const PageRouter = injectUICapabilities(PageRouterComponent);
