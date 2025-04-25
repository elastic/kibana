/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

import { Routes, Route } from '@kbn/shared-ux-router';

import { CRAWLERS_ELASTIC_MANAGED_PATH, CRAWLERS_PATH } from '../routes';
const Connectors = lazy(() => import('./connectors'));

export const CrawlersRouter: React.FC = () => {
  return (
    <Routes>
      <Route exact path={CRAWLERS_PATH}>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <Connectors isCrawler isCrawlerSelfManaged />
        </Suspense>
      </Route>
      <Route exact path={CRAWLERS_ELASTIC_MANAGED_PATH}>
        <Suspense fallback={<EuiLoadingSpinner />}>
          <Connectors isCrawler isCrawlerSelfManaged={false} />
        </Suspense>
      </Route>
    </Routes>
  );
};
