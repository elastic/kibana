/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getResolutionRunsDataStreamName } from './resolution_runs_data_stream';

/**
 * Managed saved objects for the "Resolution rule monitoring" dashboard: one data view on the run
 * stream and one dashboard with three Lens panels. The Lens format copies the detection rule
 * monitoring dashboard (`rule_monitoring/.../assets/dashboard_rule_monitoring.json`).
 */

export const getResolutionRunsDataViewId = (spaceId: string) =>
  `entity-store-resolution-runs-data-view-${spaceId}`;

export const getResolutionRuleMonitoringDashboardId = (spaceId: string) =>
  `entity-store-resolution-rule-monitoring-${spaceId}`;

export const RESOLUTION_RULE_MONITORING_DASHBOARD_TITLE = 'Entity resolution rule monitoring';

// Stable ids keep the panels the same on every install.
const PANEL_SUCCEEDED = '7a1d3c52-2f0b-4a46-9a53-0c1c1f3a0001';
const PANEL_FAILED = '7a1d3c52-2f0b-4a46-9a53-0c1c1f3a0002';
const PANEL_FAILURES_OVER_TIME = '7a1d3c52-2f0b-4a46-9a53-0c1c1f3a0003';
const PANEL_DECLINED_OVER_TIME = '7a1d3c52-2f0b-4a46-9a53-0c1c1f3a0004';

interface LensPanelSpec {
  panelId: string;
  layerId: string;
  grid: { x: number; y: number; w: number; h: number };
  description: string;
  attributes: Record<string, unknown>;
}

const EMPTY_QUERY = { query: '', language: 'kuery' } as const;

const countColumn = (label: string, kql?: string) => ({
  label,
  dataType: 'number',
  operationType: 'count',
  isBucketed: false,
  scale: 'ratio',
  sourceField: '___records___',
  customLabel: true,
  params: { emptyAsNull: true },
  ...(kql ? { filter: { query: kql, language: 'kuery' } } : {}),
});

const sumColumn = (label: string, sourceField: string) => ({
  label,
  dataType: 'number',
  operationType: 'sum',
  isBucketed: false,
  scale: 'ratio',
  sourceField,
  customLabel: true,
  params: { emptyAsNull: true },
});

const timeColumn = {
  label: '@timestamp',
  dataType: 'date',
  operationType: 'date_histogram',
  sourceField: '@timestamp',
  isBucketed: true,
  scale: 'interval',
  params: { interval: 'auto', includeEmptyRows: true, dropPartials: false },
};

const lensAttributes = ({
  dataViewId,
  layerId,
  title,
  visualizationType,
  visualization,
  columns,
  columnOrder,
}: {
  dataViewId: string;
  layerId: string;
  title: string;
  visualizationType: string;
  visualization: Record<string, unknown>;
  columns: Record<string, unknown>;
  columnOrder: string[];
}) => ({
  title,
  description: '',
  visualizationType,
  type: 'lens',
  references: [
    { id: dataViewId, name: `indexpattern-datasource-layer-${layerId}`, type: 'index-pattern' },
  ],
  state: {
    visualization,
    query: EMPTY_QUERY,
    filters: [],
    datasourceStates: {
      formBased: { layers: { [layerId]: { columns, columnOrder, incompleteColumns: {} } } },
    },
    internalReferences: [],
    adHocDataViews: {},
  },
});

const metricPanel = ({
  dataViewId,
  panelId,
  x,
  title,
  description,
  kql,
}: {
  dataViewId: string;
  panelId: string;
  x: number;
  title: string;
  description: string;
  kql: string;
}): LensPanelSpec => {
  const layerId = `${panelId}-layer`;
  const accessor = `${panelId}-count`;
  return {
    panelId,
    layerId,
    grid: { x, y: 0, w: 24, h: 8 },
    description,
    attributes: lensAttributes({
      dataViewId,
      layerId,
      title,
      visualizationType: 'lnsLegacyMetric',
      visualization: {
        layerId,
        accessor,
        layerType: 'data',
        textAlign: 'center',
        titlePosition: 'bottom',
        size: 'xl',
      },
      columns: { [accessor]: countColumn(title, kql) },
      columnOrder: [accessor],
    }),
  };
};

const barPanel = ({
  dataViewId,
  panelId,
  y,
  title,
  description,
  yColumns,
  splitField,
}: {
  dataViewId: string;
  panelId: string;
  y: number;
  title: string;
  description: string;
  yColumns: Array<{ id: string; column: Record<string, unknown> }>;
  splitField?: string;
}): LensPanelSpec => {
  const layerId = `${panelId}-layer`;
  const xId = `${panelId}-x`;
  const splitId = `${panelId}-split`;
  const columns: Record<string, unknown> = {
    [xId]: timeColumn,
    ...Object.fromEntries(yColumns.map(({ id, column }) => [id, column])),
    ...(splitField
      ? {
          [splitId]: {
            label: 'Rule',
            dataType: 'string',
            operationType: 'terms',
            scale: 'ordinal',
            sourceField: splitField,
            isBucketed: true,
            customLabel: true,
            params: {
              size: 10,
              orderBy: { type: 'column', columnId: yColumns[0].id },
              orderDirection: 'desc',
              otherBucket: true,
              missingBucket: false,
              parentFormat: { id: 'terms' },
              secondaryFields: [],
            },
          },
        }
      : {}),
  };
  return {
    panelId,
    layerId,
    grid: { x: 0, y, w: 48, h: 14 },
    description,
    attributes: lensAttributes({
      dataViewId,
      layerId,
      title,
      visualizationType: 'lnsXY',
      visualization: {
        legend: { isVisible: true, position: 'top' },
        valueLabels: 'hide',
        fittingFunction: 'None',
        axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
        gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
        preferredSeriesType: 'bar_stacked',
        layers: [
          {
            layerId,
            seriesType: 'bar_stacked',
            xAccessor: xId,
            ...(splitField ? { splitAccessor: splitId } : {}),
            accessors: yColumns.map(({ id }) => id),
            layerType: 'data',
          },
        ],
      },
      columns,
      columnOrder: [...(splitField ? [splitId] : []), xId, ...yColumns.map(({ id }) => id)],
    }),
  };
};

const getPanelSpecs = (dataViewId: string): LensPanelSpec[] => [
  metricPanel({
    dataViewId,
    panelId: PANEL_SUCCEEDED,
    x: 0,
    title: 'Succeeded runs',
    description: 'Rule runs that finished without an error in the selected time range.',
    kql: 'event.outcome : "success"',
  }),
  metricPanel({
    dataViewId,
    panelId: PANEL_FAILED,
    x: 24,
    title: 'Failed runs',
    description: 'Rule runs that stopped with an error in the selected time range.',
    kql: 'event.outcome : "failure"',
  }),
  barPanel({
    dataViewId,
    panelId: PANEL_FAILURES_OVER_TIME,
    y: 8,
    title: 'Failures over time',
    description: 'When each rule failed.',
    yColumns: [
      {
        id: `${PANEL_FAILURES_OVER_TIME}-y`,
        column: countColumn('Failed runs', 'event.outcome : "failure"'),
      },
    ],
    splitField: 'rule.id',
  }),
  barPanel({
    dataViewId,
    panelId: PANEL_DECLINED_OVER_TIME,
    y: 22,
    title: 'Groups declined over time',
    description:
      'Groups a rule found but did not link: ambiguous (two entities from one source) or over the size limit.',
    yColumns: [
      {
        id: `${PANEL_DECLINED_OVER_TIME}-y1`,
        column: sumColumn('Ambiguous', 'resolution.skipped_ambiguous'),
      },
      {
        id: `${PANEL_DECLINED_OVER_TIME}-y2`,
        column: sumColumn('Oversized', 'resolution.skipped_oversized'),
      },
    ],
  }),
];

export const getResolutionRunsDataView = (spaceId: string) => ({
  type: 'index-pattern',
  id: getResolutionRunsDataViewId(spaceId),
  managed: true,
  coreMigrationVersion: '8.8.0',
  typeMigrationVersion: '8.0.0',
  attributes: {
    name: getResolutionRunsDataStreamName(spaceId),
    title: getResolutionRunsDataStreamName(spaceId),
    timeFieldName: '@timestamp',
    allowNoIndex: true,
  },
  references: [],
});

export const getResolutionRuleMonitoringDashboard = (spaceId: string) => {
  const dataViewId = getResolutionRunsDataViewId(spaceId);
  const specs = getPanelSpecs(dataViewId);

  const panels = specs.map(({ panelId, grid, description, attributes }) => ({
    type: 'lens',
    panelIndex: panelId,
    gridData: { i: panelId, ...grid },
    embeddableConfig: {
      enhancements: { dynamicActions: { events: [] } },
      hidePanelTitles: false,
      description,
      syncColors: false,
      syncCursor: true,
      syncTooltips: false,
      filters: [],
      query: EMPTY_QUERY,
      attributes,
    },
  }));

  return {
    type: 'dashboard',
    id: getResolutionRuleMonitoringDashboardId(spaceId),
    managed: true,
    coreMigrationVersion: '8.8.0',
    typeMigrationVersion: '8.9.0',
    attributes: {
      version: 1,
      title: RESOLUTION_RULE_MONITORING_DASHBOARD_TITLE,
      description:
        'Shows how the entity resolution rules are running: how many runs succeeded or failed, when failures happened, and how many groups were declined.',
      timeRestore: true,
      timeFrom: 'now-24h',
      timeTo: 'now',
      refreshInterval: { pause: true, value: 60000 },
      optionsJSON: JSON.stringify({
        useMargins: true,
        syncColors: false,
        syncCursor: true,
        syncTooltips: false,
        hidePanelTitles: false,
      }),
      panelsJSON: JSON.stringify(panels),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({ filter: [], query: EMPTY_QUERY }),
      },
    },
    references: specs.map(({ panelId, layerId }) => ({
      id: dataViewId,
      name: `${panelId}:indexpattern-datasource-layer-${layerId}`,
      type: 'index-pattern',
    })),
  };
};
