/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createGetterSetter } from '@kbn/kibana-utils-plugin/common';
import type { CoreStart } from '@kbn/core/public';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import {
  getESQLAdHocDataview,
  getIndexForESQLQuery,
  ENABLE_ESQL,
  getESQLQueryColumns,
  getInitialESQLQuery,
} from '@kbn/esql-utils';
import type { Datasource, Visualization } from '../../types';
import { suggestionsApi } from '../../lens_suggestions_api';
import type { LensEmbeddableStartServices } from '../../react_embeddable/types';

// datasourceMap and visualizationMap setters/getters
export const [getVisualizationMap, setVisualizationMap] = createGetterSetter<
  Record<string, Visualization<unknown, unknown, unknown>>
>('VisualizationMap', false);

export const [getDatasourceMap, setDatasourceMap] = createGetterSetter<
  Record<string, Datasource<unknown, unknown>>
>('DatasourceMap', false);

export async function isCreateActionCompatible(core: CoreStart) {
  return core.uiSettings.get(ENABLE_ESQL);
}

export async function createNewEsqlAttributes(
  services: Pick<LensEmbeddableStartServices, 'data' | 'dataViews' | 'getEditorFrameService'>
) {
  const indexName = await getIndexForESQLQuery({ dataViews: services.dataViews });
  if (!indexName) {
    throw new Error('No data views');
  }
  const dataView = await getESQLAdHocDataview(`from ${indexName}`, services.dataViews);
  const editorFrameService = await services.getEditorFrameService();

  let visualizationMap = getVisualizationMap();
  let datasourceMap = getDatasourceMap();

  if (!visualizationMap || !datasourceMap) {
    [visualizationMap, datasourceMap] = await Promise.all([
      editorFrameService.loadVisualizations(),
      editorFrameService.loadDatasources(),
    ]);

    if (!visualizationMap && !datasourceMap) {
      throw new Error('Lens not setup.');
    }

    // persist for retrieval elsewhere
    setDatasourceMap(datasourceMap);
    setVisualizationMap(visualizationMap);
  }

  const esqlQuery = getInitialESQLQuery(dataView);

  const defaultEsqlQuery = {
    esql: esqlQuery,
  };

  // For the suggestions api we need only the columns
  // so we are requesting them with limit 0
  // this is much more performant than requesting
  // all the table
  const abortController = new AbortController();
  const columns = await getESQLQueryColumns({
    esqlQuery,
    search: services.data.search.search,
    signal: abortController.signal,
    timeRange: services.data.query.timefilter.timefilter.getAbsoluteTime(),
  });

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
  if (!allSuggestions.length) return undefined;
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
