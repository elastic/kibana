/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { EuiSpacer } from '@elastic/eui';
import type { EsqlParam, EsqlRequestBody } from '../../../common/types';
import { EsqlQueryForm } from '../components/esql_query_form';
import { resolveParams } from '../lib/resolve_params';
import { EsqlResultsSection } from '../components/esql_results_section';
import { PageLayout } from '../components/page_layout';
import { queryPath } from '../lib/paths';
import { parseQueryViewState, serializeQueryViewState } from '../lib/query_url_state';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

const EMPTY_PARAMS: [] = [];

/** Ad-hoc ES|QL query page; the query and parameters live in the URL so results are linkable. */
export function QueryPage() {
  const { api, history } = useServices();
  const { search, key: locationKey } = useLocation();
  const urlState = useMemo(() => parseQueryViewState(search), [search]);

  const request = useMemo<EsqlRequestBody | undefined>(
    () =>
      urlState.query
        ? {
            query: urlState.query,
            params: resolveParams(urlState.query, EMPTY_PARAMS, urlState.values, urlState.types),
          }
        : undefined,
    [urlState]
  );

  // locationKey changes on every submit, so running the same query again re-executes it.
  const { value, error, loading } = useAsync(
    async () => (request ? api.runEsql(request) : undefined),
    [api, request, locationKey]
  );

  function handleSubmit(query: string, params: EsqlParam[]) {
    history.push(queryPath(serializeQueryViewState({ query, params })));
  }

  return (
    <PageLayout
      title={i18nTexts.queryPageTitle}
      documentTitle={i18nTexts.queryPageTitle}
      description={i18nTexts.queryPageDescription}
      breadcrumbs={[{ text: i18nTexts.queryPageTitle }]}
    >
      <EsqlQueryForm
        query={urlState.query ?? ''}
        editable
        declaredParams={EMPTY_PARAMS}
        urlState={urlState}
        isRunning={loading}
        onSubmit={handleSubmit}
      />
      <EuiSpacer size="m" />
      {request ? <EsqlResultsSection request={request} result={value} error={error} /> : null}
    </PageLayout>
  );
}
