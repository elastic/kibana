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
import type {
  TypedLensSerializedState,
  TextBasedPersistedState,
  TextBasedLayerColumn,
  MetricVisualizationState,
  DatasourceMap,
  VisualizationMap,
} from '@kbn/lens-common';
import { buildTrendlineQueryWithMetricFieldMap } from '@kbn/lens-common';

import { suggestionsApi } from '../../../lens_suggestions_api';
import { readUserChartTypeFromSessionStorage } from '../../../chart_type_session_storage';

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

  // Fall back to getESQLAdHocDataview when the spec has no timeFieldName,
  // which detects the time field via HTTP (with a promise cache to avoid
  // redundant requests).
  const dataView = dataViewSpec?.timeFieldName
    ? await data.dataViews.create(dataViewSpec)
    : await getESQLAdHocDataview({
        dataViewsService: data.dataViews,
        query: query.esql,
        options: { skipFetchFields: true, id: dataViewSpec?.id },
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

    // Preserve the trendline layer when the query changes. The suggestion
    // system only produces the main layer, so a pre-existing trendline layer
    // would be dropped. We carry it over and update its query to match.
    if (preferredVisAttributes && isOfAggregateQueryType(query)) {
      preserveTrendlineLayer(attrs, preferredVisAttributes, query);
    }

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
 * When an ES|QL query changes, the suggestion system rebuilds all layers from
 * scratch, which drops the trendline layer. This function carries over the
 * trendline layer from the previous attributes and updates its query and
 * metric columns to match the new main layer.
 */
type LensAttributes = TypedLensSerializedState['attributes'];
type PartialMetricVis = Partial<MetricVisualizationState>;

const getMetricVis = (attributes: LensAttributes): PartialMetricVis =>
  attributes.state.visualization as PartialMetricVis;

const getTextBasedDsState = (attributes: LensAttributes): TextBasedPersistedState | undefined =>
  attributes.state.datasourceStates.textBased;

const preserveTrendlineLayer = (
  attrs: LensAttributes,
  prevAttributes: LensAttributes,
  query: AggregateQuery
): void => {
  const prevVis = getMetricVis(prevAttributes);
  const { trendlineLayerId } = prevVis;
  if (!trendlineLayerId) return;

  const prevDsState = getTextBasedDsState(prevAttributes);
  const prevTrendlineLayer = prevDsState?.layers[trendlineLayerId];
  if (!prevTrendlineLayer) return;

  const newDsState = getTextBasedDsState(attrs);
  if (!newDsState) return;

  // Sync trendline metric columns from the new main layer.
  // The visualization state links main accessors to trendline accessors
  // (e.g. metricAccessor → trendlineMetricAccessor). We update the
  // trendline columns to reflect any field changes in the new query.
  const newVis = getMetricVis(attrs);
  const newMainLayer = newVis.layerId ? newDsState.layers[newVis.layerId] : undefined;

  const metricAccessorPairs = [
    { from: newVis.metricAccessor, to: prevVis.trendlineMetricAccessor },
    { from: newVis.secondaryMetricAccessor, to: prevVis.trendlineSecondaryMetricAccessor },
  ];

  const breakdownColumn = newMainLayer?.columns.find(
    (c) => c.columnId === newVis.breakdownByAccessor
  );
  const activeBreakdownAccessor =
    breakdownColumn && breakdownColumn.fieldName !== prevTrendlineLayer.timeField
      ? newVis.breakdownByAccessor
      : undefined;

  const accessorPairs = [
    ...metricAccessorPairs,
    { from: activeBreakdownAccessor, to: prevVis.trendlineBreakdownByAccessor },
  ];

  const metricFields = newMainLayer
    ? metricAccessorPairs
        .map(({ from }) => newMainLayer.columns.find((c) => c.columnId === from))
        .filter((c): c is TextBasedLayerColumn => Boolean(c))
        .map((c) => c.fieldName)
    : [];
  const groupByFields =
    activeBreakdownAccessor && breakdownColumn ? [breakdownColumn.fieldName] : [];

  let trendlineQuery = prevTrendlineLayer.query;
  let metricFieldMap = new Map<string, string>();
  if (prevTrendlineLayer.timeField) {
    try {
      const trendlineQueryResult = buildTrendlineQueryWithMetricFieldMap(
        query.esql,
        prevTrendlineLayer.timeField,
        metricFields,
        groupByFields
      );
      trendlineQuery = { esql: trendlineQueryResult.query };
      metricFieldMap = trendlineQueryResult.metricFieldMap;
    } catch {
      // If the query can't be parsed, keep the existing trendline query unchanged.
    }
  }

  const updatedVisualization = { ...newVis };
  let updatedColumns = prevTrendlineLayer.columns;
  if (newMainLayer) {
    for (const { from, to } of accessorPairs) {
      if (!to) continue;
      const sourceCol = from ? newMainLayer.columns.find((c) => c.columnId === from) : undefined;
      if (!sourceCol) {
        updatedColumns = updatedColumns.filter((c) => c.columnId !== to);
        continue;
      }
      const newCol: TextBasedLayerColumn = {
        ...sourceCol,
        columnId: to,
        ...(metricFieldMap.has(sourceCol.fieldName) && {
          fieldName: metricFieldMap.get(sourceCol.fieldName),
        }),
      };
      const exists = updatedColumns.some((c) => c.columnId === to);
      updatedColumns = exists
        ? updatedColumns.map((c) => (c.columnId === to ? newCol : c))
        : [...updatedColumns, newCol];
    }
  }

  if (!newVis.secondaryMetricAccessor) {
    delete updatedVisualization.trendlineSecondaryMetricAccessor;
  }
  if (!activeBreakdownAccessor) {
    delete updatedVisualization.trendlineBreakdownByAccessor;
  }

  const updatedTrendlineLayer = {
    ...prevTrendlineLayer,
    query: trendlineQuery,
    columns: updatedColumns,
  };

  attrs.state = {
    ...attrs.state,
    visualization: updatedVisualization as MetricVisualizationState,
    datasourceStates: {
      ...attrs.state.datasourceStates,
      textBased: {
        ...newDsState,
        layers: {
          ...newDsState.layers,
          [trendlineLayerId]: updatedTrendlineLayer,
        },
      },
    },
  };
};
