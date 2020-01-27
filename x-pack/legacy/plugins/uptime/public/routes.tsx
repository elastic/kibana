/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Route, Switch } from 'react-router-dom';
import { MonitorPage, OverviewPage, NotFoundPage } from './pages';
import { AutocompleteProviderRegister } from '../../../../../src/plugins/data/public';
import { UMUpdateBreadcrumbs } from './lib/lib';

export const MONITOR_ROUTE = '/monitor/:monitorId?';
export const OVERVIEW_ROUTE = '/';

interface RouterProps {
  autocomplete: Pick<AutocompleteProviderRegister, 'getProvider'>;
  basePath: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

export const PageRouter: FC<RouterProps> = ({ autocomplete, basePath, setBreadcrumbs }) => (
  <Switch>
    <Route path={MONITOR_ROUTE}>
      <MonitorPage setBreadcrumbs={setBreadcrumbs} />
    </Route>
    <Route path={OVERVIEW_ROUTE}>
      <OverviewPage autocomplete={autocomplete} setBreadcrumbs={setBreadcrumbs} />
    </Route>
    <Route component={NotFoundPage} />
  </Switch>
);
