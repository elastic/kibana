/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Route, Switch } from 'react-router-dom';
import { DataPublicPluginSetup } from '../../../../../src/plugins/data/public';
import { OverviewPage } from './components/connected/pages/overview_container';
import { MONITOR_ROUTE, OVERVIEW_ROUTE } from '../common/constants';
import { MonitorPage, NotFoundPage } from './pages';

interface RouterProps {
  autocomplete: DataPublicPluginSetup['autocomplete'];
}

export const PageRouter: FC<RouterProps> = ({ autocomplete }) => (
  <Switch>
    <Route path={MONITOR_ROUTE}>
      <MonitorPage />
    </Route>
    <Route path={OVERVIEW_ROUTE}>
      <OverviewPage autocomplete={autocomplete} />
    </Route>
    <Route component={NotFoundPage} />
  </Switch>
);
