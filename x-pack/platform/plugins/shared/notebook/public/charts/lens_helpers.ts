/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { ChartType, getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import type { LensAttributes } from '../../common/types';

export const CHART_TYPE_OPTIONS = [
  ChartType.Bar,
  ChartType.Line,
  ChartType.Area,
  ChartType.Metric,
  ChartType.Table,
  ChartType.Pie,
] as const;

export type NotebookChartType = (typeof CHART_TYPE_OPTIONS)[number];

type TextBasedLayers = NonNullable<
  LensAttributes['state']['datasourceStates']['textBased']
>['layers'];

const mapTextBasedLayers = (
  attributes: LensAttributes,
  mapLayer: (layer: TextBasedLayers[string]) => TextBasedLayers[string]
): LensAttributes => {
  const textBased = attributes.state.datasourceStates.textBased;
  if (!textBased) return attributes;
  const layers = Object.fromEntries(
    Object.entries(textBased.layers).map(([layerId, layer]) => [layerId, mapLayer(layer)])
  );
  return {
    ...attributes,
    state: {
      ...attributes.state,
      datasourceStates: {
        ...attributes.state.datasourceStates,
        textBased: { ...textBased, layers },
      },
    },
  };
};

/** Feeds the upstream table to every text-based layer so Lens renders it without fetching. */
export const injectTable = (attributes: LensAttributes, table: Datatable): LensAttributes =>
  mapTextBasedLayers(attributes, (layer) => ({ ...layer, table }));

export const stripTables = (attributes: LensAttributes): LensAttributes =>
  mapTextBasedLayers(attributes, ({ table, ...layer }) => layer);

const isTextBasedState = (
  state: unknown
): state is NonNullable<LensAttributes['state']['datasourceStates']['textBased']> =>
  typeof state === 'object' && state !== null && 'layers' in state;

/** Applies an in-progress edit from the Lens config flyout, for live preview. */
export const applyEditorState = (
  attributes: LensAttributes,
  datasourceState: unknown,
  visualizationState: unknown,
  visualizationId?: string
): LensAttributes => ({
  ...attributes,
  visualizationType: visualizationId ?? attributes.visualizationType,
  state: {
    ...attributes.state,
    datasourceStates: isTextBasedState(datasourceState)
      ? { ...attributes.state.datasourceStates, textBased: datasourceState }
      : attributes.state.datasourceStates,
    visualization: visualizationState,
  },
});

export const getReferencedColumns = (attributes: LensAttributes): string[] =>
  Object.values(attributes.state.datasourceStates.textBased?.layers ?? {}).flatMap(({ columns }) =>
    columns.map(({ fieldName }) => fieldName)
  );

export const hasAllReferencedColumns = (attributes: LensAttributes, table: Datatable): boolean => {
  const available = new Set(table.columns.map(({ id }) => id));
  return getReferencedColumns(attributes).every((column) => available.has(column));
};

const SERIES_TYPE_CHART: Record<string, NotebookChartType> = {
  line: ChartType.Line,
  area: ChartType.Area,
  area_stacked: ChartType.Area,
};

export const getChartType = (attributes: LensAttributes): NotebookChartType | undefined => {
  switch (attributes.visualizationType) {
    case 'lnsMetric':
      return ChartType.Metric;
    case 'lnsDatatable':
      return ChartType.Table;
    case 'lnsPie':
      return ChartType.Pie;
    case 'lnsXY': {
      const { visualization } = attributes.state;
      const seriesType =
        typeof visualization === 'object' &&
        visualization !== null &&
        'preferredSeriesType' in visualization
          ? String(visualization.preferredSeriesType)
          : '';
      return SERIES_TYPE_CHART[seriesType] ?? ChartType.Bar;
    }
    default:
      return undefined;
  }
};

export interface SuggestChartArgs {
  lens: LensPublicStart;
  dataViews: DataViewsPublicPluginStart;
  query: string;
  table: Datatable;
  chartType?: NotebookChartType;
}

/** Builds Lens attributes for the source query's output via Lens suggestions, without fetching. */
export const suggestChart = async ({
  lens,
  dataViews,
  query,
  table,
  chartType,
}: SuggestChartArgs): Promise<LensAttributes | undefined> => {
  const [helpers, dataView] = await Promise.all([
    lens.stateHelperApi(),
    getESQLAdHocDataview({
      dataViewsService: dataViews,
      query,
      options: { skipFetchFields: true },
    }),
  ]);
  const suggestions = helpers.suggestions(
    {
      dataViewSpec: dataView.toSpec(false),
      fieldName: '',
      textBasedColumns: table.columns,
      query: { esql: query },
    },
    dataView,
    [],
    chartType
  );
  const [suggestion] = suggestions ?? [];
  if (!suggestion) return undefined;
  return getLensAttributesFromSuggestion({
    filters: [],
    query: { esql: query },
    suggestion,
    dataView,
  }) as LensAttributes;
};
