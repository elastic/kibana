/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import useAsync from 'react-use/lib/useAsync';
import { EuiEmptyPrompt, EuiSpacer } from '@elastic/eui';
import type { EsqlParam, EsqlRequestBody, MetadataResponse } from '../../../common/types';
import { AppButton } from '../components/app_link';
import { EsqlQueryForm } from '../components/esql_query_form';
import { resolveParams } from '../lib/resolve_params';
import { EsqlResultsSection } from '../components/esql_results_section';
import { PageLayout } from '../components/page_layout';
import { cannedQueryPath, decodeParam, queryPath } from '../lib/paths';
import { parseQueryViewState, serializeQueryViewState } from '../lib/query_url_state';
import { useServices } from '../services';
import { i18nTexts } from '../translations';

/** Runs a query configured in kibana.yml; it executes once every parameter has a value. */
export function CannedQueryPage({ metadata }: { metadata: MetadataResponse }) {
  const { api, history } = useServices();
  const params = useParams<{ queryId: string }>();
  const queryId = decodeParam(params.queryId);
  const { search, key: locationKey } = useLocation();
  const urlState = useMemo(() => parseQueryViewState(search), [search]);
  const cannedQuery = metadata.queries.find(({ id }) => id === queryId);

  const request = useMemo<EsqlRequestBody | undefined>(() => {
    if (!cannedQuery) {
      return undefined;
    }
    const resolved = resolveParams(
      cannedQuery.query,
      cannedQuery.params,
      urlState.values,
      urlState.types
    );
    const isComplete = resolved.every(({ value }) => value !== '');
    return isComplete ? { query: cannedQuery.query, params: resolved } : undefined;
  }, [cannedQuery, urlState]);

  // locationKey changes on every submit, so running the same query again re-executes it.
  const { value, error, loading } = useAsync(
    async () => (request ? api.runEsql(request) : undefined),
    [api, request, locationKey]
  );

  if (!cannedQuery) {
    return (
      <PageLayout
        title={i18nTexts.cannedQueryNotFoundTitle}
        documentTitle={queryId}
        breadcrumbs={[{ text: queryId }]}
      >
        <EuiEmptyPrompt
          iconType="magnify"
          title={<h2>{i18nTexts.cannedQueryNotFoundTitle}</h2>}
          body={<p>{i18nTexts.cannedQueryNotFoundBody(queryId)}</p>}
        />
      </PageLayout>
    );
  }

  function handleSubmit(_query: string, submittedParams: EsqlParam[]) {
    history.push(cannedQueryPath(queryId, serializeQueryViewState({ params: submittedParams })));
  }

  const editPath = queryPath(
    serializeQueryViewState({
      query: cannedQuery.query,
      params: resolveParams(cannedQuery.query, cannedQuery.params, urlState.values, urlState.types),
    })
  );

  return (
    <PageLayout
      title={cannedQuery.title}
      documentTitle={cannedQuery.title}
      description={cannedQuery.description}
      breadcrumbs={[{ text: cannedQuery.title }]}
      rightSideItems={[
        <AppButton
          iconType="pencil"
          path={editPath}
          key="edit"
          data-test-subj="indexExplorerEditCannedQuery"
        >
          {i18nTexts.editAsNewQuery}
        </AppButton>,
      ]}
    >
      <EsqlQueryForm
        query={cannedQuery.query}
        editable={false}
        declaredParams={cannedQuery.params}
        urlState={urlState}
        isRunning={loading}
        onSubmit={handleSubmit}
      />
      <EuiSpacer size="m" />
      {request ? <EsqlResultsSection request={request} result={value} error={error} /> : null}
    </PageLayout>
  );
}
