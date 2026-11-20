/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { Router } from '@kbn/shared-ux-router';
import { SEARCH_BOOST_APP_ID } from '../common/constants';
import { SearchBoostPage } from './components/search_boost_page';

export const renderApp = (core: CoreStart, { element, history }: ManagementAppMountParams) => {
  const root = createRoot(element);
  const queryClient = new QueryClient();
  root.render(
    core.rendering.addContext(
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <SearchBoostPage
            http={core.http}
            canEdit={core.application.capabilities[SEARCH_BOOST_APP_ID]?.save === true}
          />
        </Router>
      </QueryClientProvider>
    )
  );

  return () => {
    root.unmount();
  };
};
