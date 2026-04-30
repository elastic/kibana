/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { TriggersAndActionsUIPublicPluginStart } from '@kbn/triggers-actions-ui-plugin/public';
import { Router, Route, Routes } from '@kbn/shared-ux-router';

import { PLUGIN_NAME } from '../common';
import { DataSourcePreviewPage } from './data_source_preview_page';
import { DataSetsPage } from './data_sets_page';
import {
  DataSourceManagementAppContextProvider,
} from './data_source_management_app_context';
import { DATA_SOURCE_MANAGEMENT_ROUTES } from './data_source_management_routes';

const DataSetsListRoute: FunctionComponent = () => (
  <DataSetsPage pageTitle={PLUGIN_NAME} />
);

export interface DataSourceManagementAppProps {
  history: ScopedHistory;
  coreStart: CoreStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

export const DataSourceManagementApp: FunctionComponent<DataSourceManagementAppProps> = ({
  history,
  coreStart,
  triggersActionsUi,
  setBreadcrumbs,
}) => {
  return (
    <KibanaContextProvider services={coreStart}>
      <DataSourceManagementAppContextProvider
        coreStart={coreStart}
        triggersActionsUi={triggersActionsUi}
        setBreadcrumbs={setBreadcrumbs}
      >
        <Router history={history}>
          <Routes>
            <Route
              exact
              path={DATA_SOURCE_MANAGEMENT_ROUTES.connect}
              render={() => <DataSetsPage pageTitle={PLUGIN_NAME} openConnectFlyoutOnMount />}
            />
            <Route
              exact
              path={DATA_SOURCE_MANAGEMENT_ROUTES.sourceDetail}
              component={DataSourcePreviewPage}
            />
            <Route exact path={DATA_SOURCE_MANAGEMENT_ROUTES.list} component={DataSetsListRoute} />
          </Routes>
        </Router>
      </DataSourceManagementAppContextProvider>
    </KibanaContextProvider>
  );
};
