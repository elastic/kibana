/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getIndexPatternFromESQLQuery,
  getESQLAdHocDataview,
  getESQLResults,
  formatESQLColumns,
  mapVariableToColumn,
} from '@kbn/esql-utils';
import { isEqual } from 'lodash';
import { type AggregateQuery, buildEsQuery } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ESQLRow } from '@kbn/es-types';
import {
  getLensAttributesFromSuggestion,
  mapVisToChartType,
  getDatasourceId,
} from '@kbn/visualization-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getTime } from '@kbn/data-plugin/common';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import { TypedLensSerializedState } from '../../../react_embeddable/types';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';

export interface ESQLDataGridAttrs {
  rows: ESQLRow[];
  dataView: DataView;
  columns: DatatableColumn[];
}

const getDSLFilter = (queryService: DataPublicPluginStart['query'], timeFieldName?: string) => {
  const kqlQuery = queryService.queryString.getQuery();
  const filters = queryService.filterManager.getFilters();
  const timeFilter =
    queryService.timefilter.timefilter.getTime() &&
    getTime(undefined, queryService.timefilter.timefilter.getTime(), {
      fieldName: timeFieldName,
    });

  return buildEsQuery(undefined, kqlQuery || [], [
    ...(filters ?? []),
    ...(timeFilter ? [timeFilter] : []),
  ]);
};

export const getGridAttrs = async (
  query: AggregateQuery,
  adHocDataViews: DataViewSpec[],
  data: DataPublicPluginStart,
  abortController?: AbortController,
  esqlVariables: ESQLControlVariable[] = []
): Promise<ESQLDataGridAttrs> => {
  const indexPattern = getIndexPatternFromESQLQuery(query.esql);
  const dataViewSpec = adHocDataViews.find((adHoc) => {
    return adHoc.name === indexPattern;
  });

  const dataView = dataViewSpec
    ? await data.dataViews.create(dataViewSpec)
    : await getESQLAdHocDataview(query.esql, data.dataViews);

  const filter = getDSLFilter(data.query, dataView.timeFieldName);

  const results = await getESQLResults({
    esqlQuery: query.esql,
    search: data.search.search,
    signal: abortController?.signal,
    filter,
    dropNullColumns: true,
    timeRange: data.query.timefilter.timefilter.getAbsoluteTime(),
    variables: esqlVariables,
  });

  let queryColumns = results.response.columns;
  // if the query columns are empty, we need to use the all_columns property
  // which has all columns regardless if they have data or not
  if (queryColumns.length === 0 && results.response.all_columns) {
    queryColumns = results.response.all_columns;
  }

  const columns = formatESQLColumns(queryColumns);

  return {
    rows: results.response.values,
    dataView,
    columns,
  };
};

export const getSuggestions = async (
  query: AggregateQuery,
  data: DataPublicPluginStart,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap,
  adHocDataViews: DataViewSpec[],
  setErrors?: (errors: Error[]) => void,
  abortController?: AbortController,
  setDataGridAttrs?: (attrs: ESQLDataGridAttrs) => void,
  esqlVariables: ESQLControlVariable[] = [],
  shouldUpdateAttrs = true,
  preferredVisAttributes?: TypedLensSerializedState['attributes']
) => {
  try {
    const { dataView, columns, rows } = await getGridAttrs(
      query,
      adHocDataViews,
      data,
      abortController,
      esqlVariables
    );
    const updatedWithVariablesColumns = esqlVariables.length
      ? mapVariableToColumn(query.esql, esqlVariables, columns)
      : columns;

    setDataGridAttrs?.({
      rows,
      dataView,
      columns: updatedWithVariablesColumns,
    });

    if (!shouldUpdateAttrs) {
      return;
    }

    const preferredChartType = preferredVisAttributes
      ? mapVisToChartType(preferredVisAttributes.visualizationType)
      : undefined;

    const context = {
      dataViewSpec: dataView?.toSpec(false),
      fieldName: '',
      textBasedColumns: updatedWithVariablesColumns,
      query,
    };

    const allSuggestions =
      suggestionsApi({
        context,
        dataView,
        datasourceMap,
        visualizationMap,
        preferredChartType,
        preferredVisAttributes: preferredVisAttributes
          ? injectESQLQueryIntoLensLayers(preferredVisAttributes, query)
          : undefined,
      }) ?? [];

    // Lens might not return suggestions for some cases, i.e. in case of errors
    if (!allSuggestions.length) return undefined;

    const firstSuggestion = allSuggestions[0];

    const attrs = getLensAttributesFromSuggestion({
      filters: [],
      query,
      suggestion: firstSuggestion,
      dataView,
    }) as TypedLensSerializedState['attributes'];
    return {
      ...attrs,
      state: {
        ...attrs.state,
        needsRefresh: false,
      },
    };
  } catch (e) {
    setErrors?.([e]);
  }
  return undefined;
};

/**
 * Injects the ESQL query into the lens layers. This is used to keep the query in sync with the lens layers.
 * @param attributes, the current lens attributes
 * @param query, the new query to inject
 * @returns the new lens attributes with the query injected
 */
export const injectESQLQueryIntoLensLayers = (
  attributes: TypedLensSerializedState['attributes'],
  query: AggregateQuery
) => {
  const datasourceId = getDatasourceId(attributes.state.datasourceStates);

  // if the datasource is formBased, we should not fix the query
  if (!datasourceId || datasourceId === 'formBased') {
    return attributes;
  }

  if (!attributes.state.datasourceStates[datasourceId]) {
    return attributes;
  }

  const datasourceState = structuredClone(attributes.state.datasourceStates[datasourceId]);

  if (datasourceState && datasourceState.layers) {
    Object.values(datasourceState.layers).forEach((layer) => {
      if (!isEqual(layer.query, query)) {
        layer.query = query;
      }
    });
  }
  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        [datasourceId]: datasourceState,
      },
    },
  };
};
