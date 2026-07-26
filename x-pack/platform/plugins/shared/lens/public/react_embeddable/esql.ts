/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getIndexForESQLQuery,
  getESQLAdHocDataview,
  getInitialESQLQuery,
  getESQLQueryColumns,
} from '@kbn/esql-utils';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import type { LensSerializedState } from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isESQLModeEnabled } from './initializers/utils';
import type { LensEmbeddableStartServices } from './types';

// Used when no index can be discovered or when loadESQLAttributes times out.
// ROW doesn't query any index, so the panel opens and the flyout works regardless of data state.
const FALLBACK_ESQL_QUERY = 'ROW x = 1';

// If building the initial Lens state (index discovery + timefield + column query) takes longer
// than this, we fall back to FALLBACK_ESQL_QUERY so the flyout opens without waiting for slow
// FDS endpoints.
const LOAD_ESQL_ATTRIBUTES_TIMEOUT_MS = 5_000;

export type ESQLStartServices = Pick<
  LensEmbeddableStartServices,
  'dataViews' | 'data' | 'visualizationMap' | 'datasourceMap' | 'uiSettings' | 'coreStart'
>;

export async function loadESQLAttributes(
  services: ESQLStartServices
): Promise<LensSerializedState['attributes'] | undefined> {
  if (!isESQLModeEnabled({ uiSettings: services.uiSettings })) {
    return;
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutFallback = new Promise<LensSerializedState['attributes'] | undefined>((resolve) => {
    timeoutId = setTimeout(
      () =>
        buildESQLAttributes(FALLBACK_ESQL_QUERY, services).then(resolve, () => resolve(undefined)),
      LOAD_ESQL_ATTRIBUTES_TIMEOUT_MS
    );
  });

  try {
    return await Promise.race([buildMainESQLAttributes(services), timeoutFallback]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function buildMainESQLAttributes({
  dataViews,
  data,
  visualizationMap,
  datasourceMap,
  coreStart,
}: ESQLStartServices): Promise<LensSerializedState['attributes'] | undefined> {
  const indexName = await getIndexForESQLQuery({ http: coreStart.http });
  const initialQuery = indexName ? `FROM ${indexName}` : FALLBACK_ESQL_QUERY;

  const dataView = await getESQLAdHocDataview({
    dataViewsService: dataViews,
    query: initialQuery,
    http: indexName ? coreStart.http : undefined,
    options: indexName ? undefined : { allowNoIndex: true },
  });

  const esqlQuery = indexName ? getInitialESQLQuery(dataView) : FALLBACK_ESQL_QUERY;

  return buildESQLAttributesFromDataView(esqlQuery, dataView, {
    data,
    visualizationMap,
    datasourceMap,
  });
}

async function buildESQLAttributes(
  esqlQuery: string,
  { dataViews, data, visualizationMap, datasourceMap }: ESQLStartServices
): Promise<LensSerializedState['attributes'] | undefined> {
  const dataView = await getESQLAdHocDataview({
    dataViewsService: dataViews,
    query: esqlQuery,
    options: { allowNoIndex: true },
  });

  return buildESQLAttributesFromDataView(esqlQuery, dataView, {
    data,
    visualizationMap,
    datasourceMap,
  });
}

async function buildESQLAttributesFromDataView(
  esqlQuery: string,
  dataView: DataView,
  {
    data,
    visualizationMap,
    datasourceMap,
  }: Pick<ESQLStartServices, 'data' | 'visualizationMap' | 'datasourceMap'>
): Promise<LensSerializedState['attributes'] | undefined> {
  const defaultEsqlQuery = { esql: esqlQuery };

  // For the suggestions api we need only the columns
  // so we are requesting them with limit 0
  // this is much more performant than requesting
  // all the table
  const abortController = new AbortController();
  const [columns, { suggestionsApi }] = await Promise.all([
    getESQLQueryColumns({
      esqlQuery,
      search: data.search.search,
      signal: abortController.signal,
      timeRange: data.query.timefilter.timefilter.getAbsoluteTime(),
      includeColumnMetadata: true,
    }),
    import('../async_services'),
  ]);

  const context = {
    dataViewSpec: dataView.toSpec(false),
    fieldName: '',
    textBasedColumns: columns,
    query: defaultEsqlQuery,
  };

  // get the initial attributes from the suggestions api
  const allSuggestions =
    suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];

  // Lens might not return suggestions for some cases, i.e. in case of errors
  if (!allSuggestions.length) {
    return;
  }
  const [firstSuggestion] = allSuggestions;
  return getLensAttributesFromSuggestion({
    filters: [],
    query: defaultEsqlQuery,
    suggestion: {
      ...firstSuggestion,
      title: '', // when creating a new panel, we don't want to use the title from the suggestion
    },
    dataView,
  });
}
