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
import { type AggregateQuery, buildEsQuery } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-validation-autocomplete';
import type { ESQLRow } from '@kbn/es-types';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getTime } from '@kbn/data-plugin/common';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import { TypedLensSerializedState } from '../../../react_embeddable/types';
import type { LensPluginStartDependencies } from '../../../plugin';
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
  deps: LensPluginStartDependencies,
  abortController?: AbortController,
  esqlVariables: ESQLControlVariable[] = []
): Promise<ESQLDataGridAttrs> => {
  const indexPattern = getIndexPatternFromESQLQuery(query.esql);
  const dataViewSpec = adHocDataViews.find((adHoc) => {
    return adHoc.name === indexPattern;
  });

  const dataView = dataViewSpec
    ? await deps.dataViews.create(dataViewSpec)
    : await getESQLAdHocDataview(query.esql, deps.dataViews);

  const filter = getDSLFilter(deps.data.query, dataView.timeFieldName);

  const results = await getESQLResults({
    esqlQuery: query.esql,
    search: deps.data.search.search,
    signal: abortController?.signal,
    filter,
    dropNullColumns: true,
    timeRange: deps.data.query.timefilter.timefilter.getAbsoluteTime(),
    variables: esqlVariables,
  });

  const columns = formatESQLColumns(results.response.columns);

  return {
    rows: results.response.values,
    dataView,
    columns,
  };
};

export const getSuggestions = async (
  query: AggregateQuery,
  deps: LensPluginStartDependencies,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap,
  adHocDataViews: DataViewSpec[],
  setErrors?: (errors: Error[]) => void,
  abortController?: AbortController,
  setDataGridAttrs?: (attrs: ESQLDataGridAttrs) => void,
  esqlVariables: ESQLControlVariable[] = [],
  shouldUpdateAttrs = true
) => {
  try {
    const { dataView, columns, rows } = await getGridAttrs(
      query,
      adHocDataViews,
      deps,
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

    const context = {
      dataViewSpec: dataView?.toSpec(false),
      fieldName: '',
      textBasedColumns: updatedWithVariablesColumns,
      query,
    };

    const allSuggestions =
      suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];

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
