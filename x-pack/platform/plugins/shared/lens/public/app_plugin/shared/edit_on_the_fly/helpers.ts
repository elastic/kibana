/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  getIndexPatternFromESQLQuery,
  getESQLResults,
  formatESQLColumns,
  mapVariableToColumn,
} from '@kbn/esql-utils';
import { type AggregateQuery, buildEsQuery, isOfAggregateQueryType } from '@kbn/es-query';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import { getEsQueryConfig, UI_SETTINGS } from '@kbn/data-plugin/public';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { ESQLColumn, ESQLRow } from '@kbn/es-types';
import { getLensAttributesFromSuggestion, mapVisToChartType } from '@kbn/visualization-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { getTime } from '@kbn/data-plugin/common';
import { type DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { TypedLensSerializedState, DatasourceMap, VisualizationMap } from '@kbn/lens-common';

import { createEsqlAdHocDataView } from '../../../data_views_service/create_esql_ad_hoc_data_view';
import { suggestionsApi } from '../../../lens_suggestions_api';
import { readUserChartTypeFromSessionStorage } from '../../../chart_type_session_storage';
import { hydrateEsqlMetricTrendlineAfterSuggestion } from '../../../visualizations/metric/state_hydration/esql_trendline';

export interface ESQLDataGridAttrs {
  rows: ESQLRow[];
  dataView: DataView;
  columns: DatatableColumn[];
}

const columnsMatchInOrder = (a: ESQLColumn[], b: ESQLColumn[]) => {
  return a.length === b.length && a.every((col, i) => col.name === b[i]?.name);
};

export const buildDisplayRowsFromEsqlValues = ({
  displayColumns,
  valueColumns,
  values,
}: {
  displayColumns: ESQLColumn[];
  valueColumns: ESQLColumn[];
  values: ESQLRow[];
}): ESQLRow[] => {
  if (columnsMatchInOrder(valueColumns, displayColumns)) {
    return values;
  }

  // Pre-compute which value column index each display column maps to (-1 if missing)
  const valueIndexPerGridColumn = displayColumns.map((col) =>
    valueColumns.findIndex((v) => v.name === col.name)
  );
  // For each row, pick values by index; fill null for columns with no data
  return values.map((row) => valueIndexPerGridColumn.map((i) => (i >= 0 ? row[i] : null)));
};

const getDSLFilter = (
  queryService: DataPublicPluginStart['query'],
  uiSettings: IUiSettingsClient,
  timeFieldName?: string
) => {
  const esQueryConfigs = getEsQueryConfig(uiSettings);
  const kqlQuery = queryService.queryString.getQuery();
  const filters = queryService.filterManager.getFilters();
  const timeFilter =
    queryService.timefilter.timefilter.getTime() &&
    getTime(undefined, queryService.timefilter.timefilter.getTime(), {
      fieldName: timeFieldName,
    });

  return buildEsQuery(
    undefined,
    kqlQuery || [],
    [...(filters ?? []), ...(timeFilter ? [timeFilter] : [])],
    esQueryConfigs
  );
};

export const getGridAttrs = async (
  query: AggregateQuery,
  adHocDataViews: DataViewSpec[],
  data: DataPublicPluginStart,
  http: CoreStart['http'],
  uiSettings: IUiSettingsClient,
  abortController?: AbortController,
  esqlVariables: ESQLControlVariable[] = [],
  approximation?: boolean
): Promise<ESQLDataGridAttrs> => {
  const indexPattern = getIndexPatternFromESQLQuery(query.esql);
  const dataViewSpec = adHocDataViews.find((adHoc) => {
    return adHoc.title === indexPattern;
  });

  // Resolve the dataset when the spec has no timeFieldName, which detects the time
  // field via HTTP (with a promise cache to avoid redundant requests).
  const dataView = dataViewSpec?.timeFieldName
    ? await data.dataViews.create(dataViewSpec, true)
    : await createEsqlAdHocDataView({
        dataViews: data.dataViews,
        query: query.esql,
        id: dataViewSpec?.id,
        skipFetchFields: true,
        http,
      });

  const filter = getDSLFilter(data.query, uiSettings, dataView.timeFieldName);
  const timezone = uiSettings.get<'Browser' | string>(UI_SETTINGS.DATEFORMAT_TZ);
  const results = await getESQLResults({
    esqlQuery: query.esql,
    search: data.search.search,
    signal: abortController?.signal,
    filter,
    dropNullColumns: true,
    timeRange: data.query.timefilter.timefilter.getAbsoluteTime(),
    variables: esqlVariables,
    timezone,
    ...(approximation !== undefined ? { approximation } : {}),
    includeColumnMetadata: true,
  });

  const { all_columns: allColumns = [], columns: valueColumns = [], values } = results.response;
  // Use `all_columns` property if it exists in the payload,
  // which has all columns regardless if they have data or not
  const displayColumns = allColumns.length > 0 ? allColumns : valueColumns;

  const rows = buildDisplayRowsFromEsqlValues({ displayColumns, valueColumns, values });
  const columns = formatESQLColumns(displayColumns);

  return {
    rows,
    dataView,
    columns,
  };
};

export const getSuggestions = async (
  query: AggregateQuery,
  data: DataPublicPluginStart,
  http: CoreStart['http'],
  uiSettings: IUiSettingsClient,
  datasourceMap: DatasourceMap,
  visualizationMap: VisualizationMap,
  adHocDataViews: DataViewSpec[],
  setErrors?: (errors: Error[]) => void,
  abortController?: AbortController,
  setDataGridAttrs?: (attrs: ESQLDataGridAttrs) => void,
  esqlVariables: ESQLControlVariable[] = [],
  shouldUpdateAttrs = true,
  preferredVisAttributes?: TypedLensSerializedState['attributes'],
  approximation?: boolean
) => {
  try {
    const { dataView, columns, rows } = await getGridAttrs(
      query,
      adHocDataViews,
      data,
      http,
      uiSettings,
      abortController,
      esqlVariables,
      approximation
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

    // User deliberately changed the chart type
    const userDefinedChartType = readUserChartTypeFromSessionStorage();

    const preferredChartType = userDefinedChartType
      ? mapVisToChartType(userDefinedChartType)
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
        preferredVisAttributes,
      }) ?? [];

    // Lens might not return suggestions for some cases, i.e. in case of errors
    if (!allSuggestions.length) return undefined;

    const firstSuggestion = allSuggestions[0];

    const attrs = getLensAttributesFromSuggestion({
      filters: [],
      query,
      suggestion: {
        ...firstSuggestion,
        title: '',
      },
      dataView,
    }) as TypedLensSerializedState['attributes'];

    // Suggestions only rebuild the main layer. Restore metric trendline
    // accessors from the previous attributes and hydrate the hidden layer.
    if (preferredVisAttributes && isOfAggregateQueryType(query)) {
      const hydrated = hydrateEsqlMetricTrendlineAfterSuggestion({
        visualizationType: attrs.visualizationType,
        visualizationState: attrs.state.visualization,
        textBasedState: attrs.state.datasourceStates.textBased,
        previousVisualizationState: preferredVisAttributes.state.visualization,
        previousTextBasedState: preferredVisAttributes.state.datasourceStates.textBased,
        esqlQuery: query.esql,
      });
      if (hydrated) {
        attrs.state = {
          ...attrs.state,
          visualization: hydrated.visualizationState,
          datasourceStates: {
            ...attrs.state.datasourceStates,
            textBased: hydrated.textBasedState,
          },
        };
      }
    }

    return {
      ...attrs,
      state: {
        ...attrs.state,
        needsRefresh: false,
      },
    };
  } catch (e) {
    if (!abortController?.signal.aborted) {
      setErrors?.([e]);
    }
  }
  return undefined;
};
