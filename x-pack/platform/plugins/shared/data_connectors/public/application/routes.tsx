/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { DataConnectorsLayout } from './components/data_connectors_layout';
import { ConnectorsPage } from './pages/connectors_page';
import { ActiveSourcesPage } from './pages/active_sources_page';

export const DataConnectorsRoutes: React.FC = () => {
  return (
    <DataConnectorsLayout>
      <Routes>
        <Route exact path="/connectors">
          <ConnectorsPage />
        </Route>
        {/* Default to active sources page for all other routes */}
        <Route path="/">
          <ActiveSourcesPage />
        </Route>
      </Routes>
    </DataConnectorsLayout>
  );
};
