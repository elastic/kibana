/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import {
  getCaseAnalyticsDataViewId,
  getCaseActivityDataViewId,
  getCaseLifecycleDataViewId,
} from '../../common/constants';

const DASHBOARD_TYPE = 'dashboard';
const getDashboardId = (spaceId: string) => `cases-analytics-dashboard-${spaceId}`;

// ---------------------------------------------------------------------------
// Panel helpers – each returns a by-value Lens panel for panelsJSON
// ---------------------------------------------------------------------------

interface GridPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

let panelCounter = 0;
function nextPanelId() {
  return `cases-analytics-panel-${++panelCounter}`;
}

function metricPanel({
  title,
  grid,
  dataViewId,
  sourceField,
  operationType,
  label,
  formatId,
  formatParams,
}: {
  title: string;
  grid: GridPos;
  dataViewId: string;
  sourceField: string;
  operationType: string;
  label: string;
  formatId?: string;
  formatParams?: Record<string, unknown>;
}) {
  const panelId = nextPanelId();
  const layerId = `${panelId}-layer`;
  const colId = `${panelId}-metric`;

  const columnDef: Record<string, unknown> = {
    label,
    dataType: 'number',
    operationType,
    sourceField,
    isBucketed: false,
    scale: 'ratio',
    customLabel: true,
  };

  if (formatId) {
    columnDef.params = { format: { id: formatId, params: formatParams ?? {} } };
  }

  return {
    type: 'lens',
    gridData: { ...grid, i: panelId },
    panelIndex: panelId,
    embeddableConfig: {
      attributes: {
        title: '',
        description: '',
        visualizationType: 'lnsMetric',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: dataViewId,
            name: `indexpattern-datasource-layer-${layerId}`,
          },
        ],
        state: {
          visualization: {
            layerId,
            layerType: 'data',
            metricAccessor: colId,
          },
          datasourceStates: {
            formBased: {
              layers: {
                [layerId]: {
                  columns: { [colId]: columnDef },
                  columnOrder: [colId],
                  incompleteColumns: {},
                },
              },
            },
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
      enhancements: {},
    },
    title,
  };
}

function formulaMetricPanel({
  title,
  grid,
  dataViewId,
  formula,
  label,
  formatId,
  formatParams,
}: {
  title: string;
  grid: GridPos;
  dataViewId: string;
  formula: string;
  label: string;
  formatId?: string;
  formatParams?: Record<string, unknown>;
}) {
  const panelId = nextPanelId();
  const layerId = `${panelId}-layer`;
  const colId = `${panelId}-metric`;

  return {
    type: 'lens',
    gridData: { ...grid, i: panelId },
    panelIndex: panelId,
    embeddableConfig: {
      attributes: {
        title: '',
        description: '',
        visualizationType: 'lnsMetric',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: dataViewId,
            name: `indexpattern-datasource-layer-${layerId}`,
          },
        ],
        state: {
          visualization: {
            layerId,
            layerType: 'data',
            metricAccessor: colId,
          },
          datasourceStates: {
            formBased: {
              layers: {
                [layerId]: {
                  columns: {
                    [colId]: {
                      label,
                      dataType: 'number',
                      operationType: 'formula',
                      isBucketed: false,
                      scale: 'ratio',
                      customLabel: true,
                      params: {
                        formula,
                        ...(formatId
                          ? { format: { id: formatId, params: formatParams ?? {} } }
                          : {}),
                      },
                    },
                  },
                  columnOrder: [colId],
                  incompleteColumns: {},
                },
              },
            },
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
      enhancements: {},
    },
    title,
  };
}

function lineChartPanel({
  title,
  grid,
  dataViewId,
  dateField,
  metricField,
  metricOp,
  metricLabel,
  formatId,
  formatParams,
}: {
  title: string;
  grid: GridPos;
  dataViewId: string;
  dateField: string;
  metricField: string;
  metricOp: string;
  metricLabel: string;
  formatId?: string;
  formatParams?: Record<string, unknown>;
}) {
  const panelId = nextPanelId();
  const layerId = `${panelId}-layer`;
  const xColId = `${panelId}-x`;
  const yColId = `${panelId}-y`;

  const yColumn: Record<string, unknown> = {
    label: metricLabel,
    dataType: 'number',
    operationType: metricOp,
    sourceField: metricField,
    isBucketed: false,
    scale: 'ratio',
    customLabel: true,
  };

  if (formatId) {
    yColumn.params = { format: { id: formatId, params: formatParams ?? {} } };
  }

  return {
    type: 'lens',
    gridData: { ...grid, i: panelId },
    panelIndex: panelId,
    embeddableConfig: {
      attributes: {
        title: '',
        description: '',
        visualizationType: 'lnsXY',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: dataViewId,
            name: `indexpattern-datasource-layer-${layerId}`,
          },
        ],
        state: {
          visualization: {
            legend: { isVisible: false },
            valueLabels: 'hide',
            preferredSeriesType: 'line',
            layers: [
              {
                layerId,
                accessors: [yColId],
                seriesType: 'line',
                layerType: 'data',
                xAccessor: xColId,
              },
            ],
          },
          datasourceStates: {
            formBased: {
              layers: {
                [layerId]: {
                  columns: {
                    [xColId]: {
                      label: dateField,
                      dataType: 'date',
                      operationType: 'date_histogram',
                      sourceField: dateField,
                      isBucketed: true,
                      scale: 'interval',
                      params: { interval: 'auto', includeEmptyRows: true },
                    },
                    [yColId]: yColumn,
                  },
                  columnOrder: [xColId, yColId],
                  incompleteColumns: {},
                },
              },
            },
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
      enhancements: {},
    },
    title,
  };
}

function donutPanel({
  title,
  grid,
  dataViewId,
  sliceField,
}: {
  title: string;
  grid: GridPos;
  dataViewId: string;
  sliceField: string;
}) {
  const panelId = nextPanelId();
  const layerId = `${panelId}-layer`;
  const sliceColId = `${panelId}-slice`;
  const metricColId = `${panelId}-count`;

  return {
    type: 'lens',
    gridData: { ...grid, i: panelId },
    panelIndex: panelId,
    embeddableConfig: {
      attributes: {
        title: '',
        description: '',
        visualizationType: 'lnsPie',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: dataViewId,
            name: `indexpattern-datasource-layer-${layerId}`,
          },
        ],
        state: {
          visualization: {
            shape: 'donut',
            layers: [
              {
                layerId,
                primaryGroups: [sliceColId],
                metrics: [metricColId],
                numberDisplay: 'percent',
                categoryDisplay: 'default',
                legendDisplay: 'default',
                nestedLegend: false,
                layerType: 'data',
              },
            ],
          },
          datasourceStates: {
            formBased: {
              layers: {
                [layerId]: {
                  columns: {
                    [sliceColId]: {
                      label: sliceField,
                      dataType: 'string',
                      operationType: 'terms',
                      sourceField: sliceField,
                      isBucketed: true,
                      scale: 'ordinal',
                      params: {
                        size: 15,
                        orderBy: { type: 'column', columnId: metricColId },
                        orderDirection: 'desc',
                        otherBucket: true,
                        missingBucket: false,
                        parentFormat: { id: 'terms' },
                      },
                    },
                    [metricColId]: {
                      label: 'Count',
                      dataType: 'number',
                      operationType: 'count',
                      sourceField: '___records___',
                      isBucketed: false,
                      scale: 'ratio',
                    },
                  },
                  columnOrder: [sliceColId, metricColId],
                  incompleteColumns: {},
                },
              },
            },
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
      enhancements: {},
    },
    title,
  };
}

function tablePanel({
  title,
  grid,
  dataViewId,
  columns,
  sortColumnId,
}: {
  title: string;
  grid: GridPos;
  dataViewId: string;
  columns: Array<{
    id: string;
    label: string;
    sourceField: string;
    operationType: string;
    dataType: string;
    isBucketed: boolean;
    params?: Record<string, unknown>;
  }>;
  sortColumnId?: string;
}) {
  const panelId = nextPanelId();
  const layerId = `${panelId}-layer`;

  const colDefs: Record<string, unknown> = {};
  const colOrder: string[] = [];

  for (const col of columns) {
    colDefs[col.id] = {
      label: col.label,
      dataType: col.dataType,
      operationType: col.operationType,
      sourceField: col.sourceField,
      isBucketed: col.isBucketed,
      scale: col.isBucketed ? 'ordinal' : 'ratio',
      customLabel: true,
      ...(col.params ? { params: col.params } : {}),
    };
    colOrder.push(col.id);
  }

  return {
    type: 'lens',
    gridData: { ...grid, i: panelId },
    panelIndex: panelId,
    embeddableConfig: {
      attributes: {
        title: '',
        description: '',
        visualizationType: 'lnsDatatable',
        type: 'lens',
        references: [
          {
            type: 'index-pattern',
            id: dataViewId,
            name: `indexpattern-datasource-layer-${layerId}`,
          },
        ],
        state: {
          visualization: {
            layerId,
            layerType: 'data',
            columns: columns.map((c) => ({ columnId: c.id })),
            ...(sortColumnId
              ? {
                  sorting: {
                    columnId: sortColumnId,
                    direction: 'desc',
                  },
                }
              : {}),
          },
          datasourceStates: {
            formBased: {
              layers: {
                [layerId]: {
                  columns: colDefs,
                  columnOrder: colOrder,
                  incompleteColumns: {},
                },
              },
            },
          },
          query: { query: '', language: 'kuery' },
          filters: [],
        },
      },
      enhancements: {},
    },
    title,
  };
}

// ---------------------------------------------------------------------------
// Dashboard composition
// ---------------------------------------------------------------------------

function buildPanels(spaceId: string) {
  // Reset counter so panel IDs are deterministic across calls
  panelCounter = 0;

  const lifecycleDv = getCaseLifecycleDataViewId(spaceId);
  const activityDv = getCaseActivityDataViewId(spaceId);
  const contentDv = getCaseAnalyticsDataViewId(spaceId);

  const durationFormat = {
    formatId: 'duration',
    formatParams: {
      inputFormat: 'milliseconds',
      outputFormat: 'humanizePrecise',
      outputPrecision: 1,
    },
  };

  return [
    // --- Row 0: KPI metrics (4 across) ---
    metricPanel({
      title: 'Total Cases',
      grid: { x: 0, y: 0, w: 12, h: 7 },
      dataViewId: lifecycleDv,
      sourceField: '___records___',
      operationType: 'count',
      label: 'Total Cases',
    }),
    metricPanel({
      title: 'Avg Resolution Time',
      grid: { x: 12, y: 0, w: 12, h: 7 },
      dataViewId: lifecycleDv,
      sourceField: 'time_to_close_ms',
      operationType: 'average',
      label: 'Avg Resolution Time',
      ...durationFormat,
    }),
    metricPanel({
      title: 'Avg First Response',
      grid: { x: 24, y: 0, w: 12, h: 7 },
      dataViewId: lifecycleDv,
      sourceField: 'time_to_first_comment_ms',
      operationType: 'average',
      label: 'Avg First Response',
      ...durationFormat,
    }),
    metricPanel({
      title: 'Avg First Assignment',
      grid: { x: 36, y: 0, w: 12, h: 7 },
      dataViewId: lifecycleDv,
      sourceField: 'time_to_first_assignment_ms',
      operationType: 'average',
      label: 'Avg First Assignment',
      ...durationFormat,
    }),

    // --- Row 1: Charts ---
    lineChartPanel({
      title: 'Resolution Time Trend',
      grid: { x: 0, y: 7, w: 24, h: 15 },
      dataViewId: lifecycleDv,
      dateField: 'latest_activity_at',
      metricField: 'time_to_close_ms',
      metricOp: 'average',
      metricLabel: 'Avg Resolution Time',
      ...durationFormat,
    }),
    donutPanel({
      title: 'Activity Breakdown',
      grid: { x: 24, y: 7, w: 24, h: 15 },
      dataViewId: activityDv,
      sliceField: 'type',
    }),

    // --- Row 2: Bar chart + table ---
    lineChartPanel({
      title: 'Cases Created Over Time',
      grid: { x: 0, y: 22, w: 24, h: 15 },
      dataViewId: contentDv,
      dateField: 'created_at',
      metricField: '___records___',
      metricOp: 'count',
      metricLabel: 'Cases Created',
    }),
    tablePanel({
      title: 'Most Active Cases',
      grid: { x: 24, y: 22, w: 24, h: 15 },
      dataViewId: lifecycleDv,
      sortColumnId: 'tbl-total-actions',
      columns: [
        {
          id: 'tbl-case-id',
          label: 'Case ID',
          sourceField: 'case_id',
          operationType: 'terms',
          dataType: 'string',
          isBucketed: true,
          params: {
            size: 20,
            orderBy: { type: 'column', columnId: 'tbl-total-actions' },
            orderDirection: 'desc',
            otherBucket: false,
            missingBucket: false,
            parentFormat: { id: 'terms' },
          },
        },
        {
          id: 'tbl-total-actions',
          label: 'Total Actions',
          sourceField: 'total_actions',
          operationType: 'max',
          dataType: 'number',
          isBucketed: false,
        },
        {
          id: 'tbl-total-comments',
          label: 'Comments',
          sourceField: 'total_comments',
          operationType: 'max',
          dataType: 'number',
          isBucketed: false,
        },
        {
          id: 'tbl-reassignments',
          label: 'Reassignments',
          sourceField: 'total_reassignments',
          operationType: 'max',
          dataType: 'number',
          isBucketed: false,
        },
      ],
    }),

    // --- Row 3: Closure Rate KPI + Cases Closed count ---
    formulaMetricPanel({
      title: 'Closure Rate',
      grid: { x: 0, y: 37, w: 12, h: 7 },
      dataViewId: lifecycleDv,
      // Ratio of cases that have a recorded close time to all cases.
      formula: "count(kql='closed_at: *') / count() * 100",
      label: 'Closure Rate',
      formatId: 'percent',
      formatParams: { decimals: 1, formatOverflowValues: false },
    }),
    formulaMetricPanel({
      title: 'Cases Closed',
      grid: { x: 12, y: 37, w: 12, h: 7 },
      dataViewId: lifecycleDv,
      formula: "count(kql='closed_at: *')",
      label: 'Cases Closed',
    }),

    // --- Row 4: Workload by Assignee ---
    // Groups activity documents by assignee UID ranked by case count.
    // UID is the only identifier available at sync time; username enrichment
    // via an ES enrich processor is the recommended follow-up.
    tablePanel({
      title: 'Workload by Assignee',
      grid: { x: 0, y: 44, w: 48, h: 15 },
      dataViewId: activityDv,
      sortColumnId: 'wl-case-count',
      columns: [
        {
          id: 'wl-assignee-uid',
          label: 'Assignee (UID)',
          sourceField: 'payload.assignees.uid',
          operationType: 'terms',
          dataType: 'string',
          isBucketed: true,
          params: {
            size: 20,
            orderBy: { type: 'column', columnId: 'wl-case-count' },
            orderDirection: 'desc',
            otherBucket: false,
            missingBucket: false,
            parentFormat: { id: 'terms' },
          },
        },
        {
          id: 'wl-case-count',
          label: 'Cases Assigned',
          sourceField: 'case_id',
          operationType: 'unique_count',
          dataType: 'number',
          isBucketed: false,
        },
        {
          id: 'wl-action-count',
          label: 'Total Actions',
          sourceField: '___records___',
          operationType: 'count',
          dataType: 'number',
          isBucketed: false,
        },
      ],
    }),
  ];
}

// ---------------------------------------------------------------------------
// Provisioning
// ---------------------------------------------------------------------------

export async function provisionAnalyticsDashboard(
  savedObjectsClient: SavedObjectsClientContract,
  logger: Logger,
  spaceId: string
): Promise<void> {
  const dashboardId = getDashboardId(spaceId);
  // In Kibana, the "default" space maps to undefined in the SO namespace field.
  const namespace = spaceId === 'default' ? undefined : spaceId;

  try {
    // Check if dashboard already exists
    const existing = await savedObjectsClient
      .get(DASHBOARD_TYPE, dashboardId, { namespace })
      .catch(() => null);

    if (existing) {
      logger.debug(`Cases analytics dashboard already exists in space ${spaceId}. Skipping.`);
      return;
    }

    const panels = buildPanels(spaceId);

    await savedObjectsClient.create(
      DASHBOARD_TYPE,
      {
        title: 'Cases Analytics',
        description:
          'Overview of case lifecycle metrics, activity breakdown, and operational KPIs.',
        kibanaSavedObjectMeta: {
          searchSourceJSON: JSON.stringify({
            query: { query: '', language: 'kuery' },
            filter: [],
          }),
        },
        optionsJSON: JSON.stringify({
          useMargins: true,
          syncColors: false,
          syncCursor: true,
          syncTooltips: false,
          hidePanelTitles: false,
        }),
        panelsJSON: JSON.stringify(panels),
        timeRestore: true,
        timeFrom: 'now-30d',
        timeTo: 'now',
      },
      { id: dashboardId, overwrite: false, namespace }
    );

    logger.info(`Created Cases Analytics dashboard in space ${spaceId}`);
  } catch (error) {
    logger.error(
      `Failed to provision Cases Analytics dashboard in space ${spaceId}: ${error.message}`
    );
  }
}
