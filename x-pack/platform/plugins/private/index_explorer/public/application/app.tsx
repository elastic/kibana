/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { ScopedHistory } from '@kbn/core/public';
import { Route, Router, Routes } from '@kbn/shared-ux-router';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { ErrorCallout } from './components/error_callout';
import { ROUTES } from './lib/paths';
import { CannedQueryPage } from './pages/canned_query_page';
import { DocumentPage } from './pages/document_page';
import { HomePage } from './pages/home_page';
import { IndexPage } from './pages/index_page';
import { QueryPage } from './pages/query_page';
import { useServices } from './services';
import { i18nTexts } from './translations';

export function App({ history }: { history: ScopedHistory }) {
  const { api } = useServices();
  const { value: metadata, error, loading } = useAsync(() => api.getMetadata(), [api]);

  if (loading) {
    return (
      <KibanaPageTemplate>
        <KibanaPageTemplate.EmptyPrompt icon={<EuiLoadingSpinner size="xl" />} />
      </KibanaPageTemplate>
    );
  }
  if (error || !metadata) {
    return (
      <KibanaPageTemplate>
        <KibanaPageTemplate.Section>
          <ErrorCallout title={i18nTexts.loadMetadataError} error={error} />
        </KibanaPageTemplate.Section>
      </KibanaPageTemplate>
    );
  }

  return (
    <Router history={history}>
      <Routes>
        <Route exact path={ROUTES.home}>
          <HomePage metadata={metadata} />
        </Route>
        <Route exact path={ROUTES.query}>
          <QueryPage />
        </Route>
        <Route exact path={ROUTES.cannedQuery}>
          <CannedQueryPage metadata={metadata} />
        </Route>
        <Route exact path={ROUTES.document}>
          <DocumentPage />
        </Route>
        <Route exact path={ROUTES.index}>
          <IndexPage metadata={metadata} />
        </Route>
      </Routes>
    </Router>
  );
}
