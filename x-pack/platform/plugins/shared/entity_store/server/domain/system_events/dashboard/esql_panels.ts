/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builders for ES|QL Lens panels in the dashboard saved object format. The shape mirrors the
// managed Agent Builder overview dashboard
// (x-pack/platform/plugins/shared/agent_builder_platform/server/dashboard/assets/overview_dashboard.ts).

export interface GridData {
  x: number;
  y: number;
  w: number;
  h: number;
  sectionId?: string;
}

/** Panel-level time range that overrides the dashboard time picker. */
export interface PanelTimeRange {
  from: string;
  to: string;
}

interface Column {
  id: string;
  field: string;
  type: 'date' | 'number' | 'string';
}

const LAYER_ID = 'layer_0';

/** Colors for values that need attention. */
export const STATUS_COLOR = { warning: '#F5A700', danger: '#C61E25' } as const;

/** A palette that colors values at or above `from`, in the Lens custom palette format. */
export const thresholdPalette = ({ from, color }: { from: number; color: string }) => ({
  type: 'palette',
  name: 'custom',
  params: {
    name: 'custom',
    reverse: false,
    rangeType: 'number',
    rangeMin: from,
    rangeMax: null,
    progression: 'fixed',
    stops: [{ color, stop: null }],
    colorStops: [{ color, stop: from }],
    steps: 1,
    maxSteps: 5,
    continuity: 'above',
  },
});

const adHocDataViewFor = (index: string, timeFiltered: boolean) => ({
  id: `${index}-${timeFiltered ? '@timestamp' : 'all-time'}`,
  title: index,
  name: index,
  ...(timeFiltered ? { timeFieldName: '@timestamp' } : {}),
  sourceFilters: [],
  fieldFormats: {},
  runtimeFieldMap: {},
  fieldAttrs: {},
  allowNoIndex: true,
  allowHidden: true,
  type: 'esql',
});

const buildLensPanel = ({
  panelId,
  title,
  grid,
  index,
  esql,
  columns,
  visualizationType,
  visualization,
  timeRange,
  timeFiltered = true,
}: {
  panelId: string;
  title: string;
  grid: GridData;
  index: string;
  esql: string;
  columns: Column[];
  visualizationType: 'lnsMetric' | 'lnsXY' | 'lnsDatatable';
  visualization: Record<string, unknown>;
  timeRange?: PanelTimeRange;
  /** False for panels about current state: the dashboard time picker does not filter them. */
  timeFiltered?: boolean;
}) => {
  const dataView = adHocDataViewFor(index, timeFiltered);
  return {
    type: 'vis',
    panelIndex: panelId,
    gridData: { ...grid, i: panelId },
    embeddableConfig: {
      title,
      ...(timeRange ? { timeRange } : {}),
      attributes: {
        visualizationType,
        title: '',
        references: [],
        state: {
          datasourceStates: {
            textBased: {
              layers: {
                [LAYER_ID]: {
                  index: dataView.id,
                  query: { esql },
                  ...(timeFiltered ? { timeField: '@timestamp' } : {}),
                  columns: columns.map(({ id, field, type }) => ({
                    columnId: id,
                    fieldName: field,
                    label: field,
                    customLabel: true,
                    meta: { type },
                  })),
                  ignoreGlobalFilters: false,
                },
              },
            },
          },
          internalReferences: [
            {
              type: 'index-pattern',
              id: dataView.id,
              name: `indexpattern-datasource-layer-${LAYER_ID}`,
            },
          ],
          visualization,
          adHocDataViews: { [dataView.id]: dataView },
          filters: [],
          query: { esql },
        },
      },
    },
  };
};

export const metricPanel = ({
  panelId,
  title,
  grid,
  index,
  esql,
  metric,
  secondary,
  secondaryType = 'string',
  breakdown,
  palette,
  timeRange,
  timeFiltered,
}: {
  panelId: string;
  title: string;
  grid: GridData;
  index: string;
  esql: string;
  metric: string;
  /** A second column shown in small text under the value, labelled with its field name. */
  secondary?: string;
  secondaryType?: 'number' | 'string';
  breakdown?: string;
  palette?: ReturnType<typeof thresholdPalette>;
  timeRange?: PanelTimeRange;
  timeFiltered?: boolean;
}) =>
  buildLensPanel({
    panelId,
    title,
    grid,
    index,
    esql,
    timeRange,
    timeFiltered,
    visualizationType: 'lnsMetric',
    columns: [
      { id: 'metric', field: metric, type: 'number' },
      ...(secondary ? [{ id: 'secondary', field: secondary, type: secondaryType }] : []),
      ...(breakdown ? [{ id: 'breakdown', field: breakdown, type: 'string' as const }] : []),
    ],
    visualization: {
      layerId: LAYER_ID,
      layerType: 'data',
      metricAccessor: 'metric',
      ...(secondary ? { secondaryMetricAccessor: 'secondary' } : {}),
      ...(breakdown ? { breakdownByAccessor: 'breakdown', maxCols: 4 } : {}),
      ...(palette ? { palette, applyColorTo: 'background' } : {}),
      showBar: false,
    },
  });

export const xyPanel = ({
  panelId,
  title,
  grid,
  index,
  esql,
  x,
  y,
  breakdown,
  seriesType = 'bar_stacked',
  rightAxis = [],
  timeRange,
}: {
  panelId: string;
  title: string;
  grid: GridData;
  index: string;
  esql: string;
  x: string;
  y: string[];
  breakdown?: string;
  seriesType?: 'bar_stacked' | 'bar' | 'line';
  /** Fields from `y` drawn against the right axis, for series on a much smaller scale. */
  rightAxis?: string[];
  timeRange?: PanelTimeRange;
}) =>
  buildLensPanel({
    panelId,
    title,
    grid,
    index,
    esql,
    timeRange,
    visualizationType: 'lnsXY',
    columns: [
      { id: 'x', field: x, type: 'date' },
      ...y.map((field, i) => ({ id: `y_${i}`, field, type: 'number' as const })),
      ...(breakdown ? [{ id: 'breakdown', field: breakdown, type: 'string' as const }] : []),
    ],
    visualization: {
      preferredSeriesType: seriesType,
      legend: { isVisible: true, showSingleSeries: false, position: 'bottom' },
      valueLabels: 'hide',
      axisTitlesVisibilitySettings: { x: false, yLeft: false, yRight: true },
      layers: [
        {
          layerId: LAYER_ID,
          layerType: 'data',
          seriesType,
          xAccessor: 'x',
          accessors: y.map((_, i) => `y_${i}`),
          yConfig: y.map((field, i) => ({
            forAccessor: `y_${i}`,
            axisMode: rightAxis.includes(field) ? 'right' : 'left',
          })),
          ...(breakdown ? { splitAccessors: ['breakdown'] } : {}),
        },
      ],
    },
  });

export const tablePanel = ({
  panelId,
  title,
  grid,
  index,
  esql,
  columns,
  timeRange,
  timeFiltered,
}: {
  panelId: string;
  title: string;
  grid: GridData;
  index: string;
  esql: string;
  /** `alert: true` colors the cell when the value is above zero; `width` is in pixels. */
  columns: Array<{ field: string; type: Column['type']; alert?: boolean; width?: number }>;
  timeRange?: PanelTimeRange;
  timeFiltered?: boolean;
}) => {
  const tableColumns = columns.map(({ field, type }, i) => ({ id: `col_${i}`, field, type }));
  return buildLensPanel({
    panelId,
    title,
    grid,
    index,
    esql,
    timeRange,
    timeFiltered,
    visualizationType: 'lnsDatatable',
    columns: tableColumns,
    visualization: {
      layerId: LAYER_ID,
      layerType: 'data',
      columns: tableColumns.map(({ id, type }, i) => ({
        columnId: id,
        isTransposed: false,
        alignment: type === 'number' ? 'right' : 'left',
        ...(columns[i].width ? { width: columns[i].width } : {}),
        ...(columns[i].alert
          ? {
              colorMode: 'cell',
              palette: thresholdPalette({ from: 1, color: STATUS_COLOR.danger }),
            }
          : {}),
      })),
    },
  });
};

export const markdownPanel = ({
  panelId,
  grid,
  content,
}: {
  panelId: string;
  grid: GridData;
  content: string;
}) => ({
  type: 'markdown',
  panelIndex: panelId,
  gridData: { ...grid, i: panelId },
  embeddableConfig: { content, settings: { open_links_in_new_tab: false } },
});
