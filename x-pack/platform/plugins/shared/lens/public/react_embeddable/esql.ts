/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexForESQLQuery, getInitialESQLQuery, getESQLQueryColumns } from '@kbn/esql-utils';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { LENS_DATASOURCE_ID, LENS_LAYER_TYPES, type LensSerializedState } from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import { withTimeout } from '@kbn/std';
import { generateId } from '../id_generator';
import { createEsqlAdHocDataView } from '../data_views_service/create_esql_ad_hoc_data_view';
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

  const main = buildMainESQLAttributes(services);
  const outcome = await withTimeout({
    promise: main,
    timeoutMs: LOAD_ESQL_ATTRIBUTES_TIMEOUT_MS,
  });
  if (!outcome.timedout) {
    return outcome.value;
  }

  // The deadline only starts the fallback. Main stays in the race, so a result that
  // lands while the fallback is still building still wins.
  const fallback = buildESQLAttributes(FALLBACK_ESQL_QUERY, services).then(
    (attributes) => attributes,
    () => undefined
  );
  return Promise.race([main, fallback]);
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

  const dataView = await createEsqlAdHocDataView({
    dataViews,
    query: initialQuery,
    http: indexName ? coreStart.http : undefined,
    allowNoIndex: !indexName,
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
  const dataView = await createEsqlAdHocDataView({
    dataViews,
    query: esqlQuery,
    allowNoIndex: true,
  });

  return buildESQLAttributesFromDataView(esqlQuery, dataView, {
    data,
    visualizationMap,
    datasourceMap,
  });
}

function createQueryBackedEsqlAttributes(
  esqlQuery: string,
  dataView: DataView,
  error?: Error
): LensSerializedState['attributes'] {
  const layerId = generateId();
  return getLensAttributesFromSuggestion({
    filters: [],
    query: { esql: esqlQuery },
    suggestion: {
      title: '',
      visualizationId: 'lnsDatatable',
      datasourceId: LENS_DATASOURCE_ID.TEXT_BASED,
      datasourceState: {
        layers: {
          [layerId]: {
            columns: [],
            index: dataView.id,
            query: { esql: esqlQuery },
            timeField: dataView.timeFieldName,
            ...(error ? { errors: [error] } : {}),
          },
        },
      },
      visualizationState: {
        columns: [],
        layerId,
        layerType: LENS_LAYER_TYPES.DATA,
        showRowNumbers: true,
      },
      columns: 0,
      score: 0,
      previewIcon: 'visTable',
      changeType: 'initial',
      keptLayerIds: [layerId],
    },
    dataView,
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

  try {
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

    // Suggestions need columns. Keep a typed document so the flyout can still open.
    if (!allSuggestions.length) {
      return createQueryBackedEsqlAttributes(esqlQuery, dataView);
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
  } catch (error) {
    return createQueryBackedEsqlAttributes(
      esqlQuery,
      dataView,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
