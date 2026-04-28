/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsImporter, Logger } from '@kbn/core/server';
import { Readable } from 'stream';

const DATA_VIEW_ID = 'agent-builder-traces';
const INDEX_PATTERN = '.ds-traces-agent_builder*';
const OVERVIEW_DASHBOARD_ID = 'agent-builder-overview';

export const installDashboards = async (
  savedObjectsImporter: ISavedObjectsImporter,
  logger: Logger
): Promise<void> => {
  logger.debug('Installing Agent Builder dashboard assets...');

  const assets = buildAssets();

  const importResult = await savedObjectsImporter.import({
    readStream: Readable.from(assets),
    managed: true,
    overwrite: true,
    createNewCopies: false,
    refresh: false,
  });

  importResult.warnings.forEach((w) => {
    logger.warn(w.message);
  });

  if (!importResult.success) {
    const errors = (importResult.errors ?? []).map(
      (e) => `Couldn't import "${e.type}:${e.id}": ${JSON.stringify(e.error)}`
    );
    errors.forEach((e) => logger.error(e));
    throw new Error(errors[0] ?? 'Unknown error');
  }

  logger.debug('Agent Builder dashboard assets installed');
};

function buildAssets() {
  return [buildDataView(), buildOverviewDashboard()];
}

function buildDataView() {
  return {
    type: 'index-pattern',
    id: DATA_VIEW_ID,
    managed: true,
    typeMigrationVersion: '7.11.0',
    coreMigrationVersion: '8.8.0',
    attributes: {
      name: 'Agent Builder Traces',
      title: INDEX_PATTERN,
      timeFieldName: '@timestamp',
    },
    references: [],
  };
}

// ---------------------------------------------------------------------------
// Panel builder helpers
// ---------------------------------------------------------------------------

interface MetricPanelConfig {
  panelId: string;
  title: string;
  field: string;
  operation: 'sum' | 'count';
  x: number;
  y: number;
  w?: number;
  h?: number;
  filter?: string;
}

interface XYPanelConfig {
  panelId: string;
  title: string;
  valueField: string;
  valueLabel: string;
  valueOperation: 'sum' | 'count' | 'average' | 'median';
  splitField: string;
  splitLabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
  seriesType?: 'bar_stacked' | 'line' | 'area_stacked';
  filter?: string;
}

interface TablePanelConfig {
  panelId: string;
  title: string;
  bucketField: string;
  bucketLabel: string;
  metrics: Array<{
    id: string;
    label: string;
    field: string;
    operation: 'sum' | 'count' | 'average' | 'median';
  }>;
  x: number;
  y: number;
  w?: number;
  h?: number;
  filter?: string;
}

function ref(layerId: string) {
  return {
    id: DATA_VIEW_ID,
    name: `indexpattern-datasource-layer-${layerId}`,
    type: 'index-pattern',
  };
}

function panelRef(panelId: string, layerId: string) {
  return {
    id: DATA_VIEW_ID,
    name: `${panelId}:indexpattern-datasource-layer-${layerId}`,
    type: 'index-pattern',
  };
}

function buildMetricColumn(
  colId: string,
  label: string,
  field: string,
  operation: 'sum' | 'count'
) {
  if (operation === 'count') {
    return {
      label,
      dataType: 'number' as const,
      operationType: 'count',
      isBucketed: false,
      scale: 'ratio' as const,
      sourceField: '___records___',
      params: { emptyAsNull: true },
      customLabel: true,
    };
  }
  return {
    label,
    dataType: 'number' as const,
    operationType: 'sum',
    sourceField: field,
    isBucketed: false,
    scale: 'ratio' as const,
    params: { emptyAsNull: true },
    customLabel: true,
  };
}

function buildMetricPanel({
  panelId,
  title,
  field,
  operation,
  x,
  y,
  w = 12,
  h = 6,
  filter,
}: MetricPanelConfig) {
  const layerId = `layer-${panelId}`;
  const colMetric = `col-${panelId}-metric`;

  return {
    panel: {
      type: 'lens' as const,
      panelIndex: panelId,
      title,
      gridData: { i: panelId, x, y, w, h },
      embeddableConfig: {
        hidePanelTitles: false,
        attributes: {
          title,
          visualizationType: 'lnsMetric',
          type: 'lens',
          references: [ref(layerId)],
          state: {
            visualization: {
              layerId,
              layerType: 'data',
              metricAccessor: colMetric,
            },
            datasourceStates: {
              formBased: {
                layers: {
                  [layerId]: {
                    columns: {
                      [colMetric]: buildMetricColumn(colMetric, title, field, operation),
                    },
                    columnOrder: [colMetric],
                    incompleteColumns: {},
                  },
                },
              },
            },
            query: { query: filter ?? '', language: 'kuery' },
            filters: [],
          },
        },
        enhancements: {},
      },
    },
    references: [panelRef(panelId, layerId)],
  };
}

function buildXYPanel({
  panelId,
  title,
  valueField,
  valueLabel,
  valueOperation,
  splitField,
  splitLabel,
  x,
  y,
  w,
  h,
  seriesType = 'bar_stacked',
  filter,
}: XYPanelConfig) {
  const layerId = `layer-${panelId}`;
  const colTimestamp = `col-${panelId}-timestamp`;
  const colValue = `col-${panelId}-value`;
  const colSplit = `col-${panelId}-split`;

  const valueColumn: Record<string, unknown> = {
    label: valueLabel,
    dataType: 'number',
    isBucketed: false,
    scale: 'ratio',
    params: { emptyAsNull: true },
    customLabel: true,
  };

  if (valueOperation === 'count') {
    valueColumn.operationType = 'count';
    valueColumn.sourceField = '___records___';
  } else {
    valueColumn.operationType = valueOperation;
    valueColumn.sourceField = valueField;
  }

  return {
    panel: {
      type: 'lens' as const,
      panelIndex: panelId,
      title,
      gridData: { i: panelId, x, y, w, h },
      embeddableConfig: {
        hidePanelTitles: false,
        attributes: {
          title,
          visualizationType: 'lnsXY',
          type: 'lens',
          references: [ref(layerId)],
          state: {
            visualization: {
              preferredSeriesType: seriesType,
              legend: { isVisible: true, position: 'right', showSingleSeries: true },
              valueLabels: 'hide',
              layers: [
                {
                  layerId,
                  seriesType,
                  xAccessor: colTimestamp,
                  splitAccessor: colSplit,
                  accessors: [colValue],
                  layerType: 'data',
                },
              ],
            },
            datasourceStates: {
              formBased: {
                layers: {
                  [layerId]: {
                    columns: {
                      [colTimestamp]: {
                        label: '@timestamp',
                        dataType: 'date',
                        operationType: 'date_histogram',
                        sourceField: '@timestamp',
                        isBucketed: true,
                        scale: 'interval',
                        params: { interval: 'auto', includeEmptyRows: true, dropPartials: false },
                      },
                      [colValue]: valueColumn,
                      [colSplit]: {
                        label: splitLabel,
                        dataType: 'string',
                        operationType: 'terms',
                        scale: 'ordinal',
                        sourceField: splitField,
                        isBucketed: true,
                        params: {
                          size: 10,
                          orderBy: { type: 'column', columnId: colValue },
                          orderDirection: 'desc',
                          otherBucket: true,
                          missingBucket: false,
                          parentFormat: { id: 'terms' },
                          secondaryFields: [],
                        },
                        customLabel: true,
                      },
                    },
                    columnOrder: [colSplit, colTimestamp, colValue],
                    incompleteColumns: {},
                  },
                },
              },
            },
            query: { query: filter ?? '', language: 'kuery' },
            filters: [],
          },
        },
        enhancements: {},
      },
    },
    references: [panelRef(panelId, layerId)],
  };
}

function buildTablePanel({
  panelId,
  title,
  bucketField,
  bucketLabel,
  metrics,
  x,
  y,
  w = 24,
  h = 12,
  filter,
}: TablePanelConfig) {
  const layerId = `layer-${panelId}`;
  const colBucket = `col-${panelId}-bucket`;

  const metricColumns: Record<string, Record<string, unknown>> = {};
  const columnIds = [colBucket];

  for (const m of metrics) {
    const colId = `col-${panelId}-${m.id}`;
    columnIds.push(colId);

    if (m.operation === 'count') {
      metricColumns[colId] = {
        label: m.label,
        dataType: 'number',
        operationType: 'count',
        isBucketed: false,
        scale: 'ratio',
        sourceField: '___records___',
        params: { emptyAsNull: true },
        customLabel: true,
      };
    } else {
      metricColumns[colId] = {
        label: m.label,
        dataType: 'number',
        operationType: m.operation,
        sourceField: m.field,
        isBucketed: false,
        scale: 'ratio',
        params: { emptyAsNull: true },
        customLabel: true,
      };
    }
  }

  const firstMetricColId = `col-${panelId}-${metrics[0].id}`;

  return {
    panel: {
      type: 'lens' as const,
      panelIndex: panelId,
      title,
      gridData: { i: panelId, x, y, w, h },
      embeddableConfig: {
        hidePanelTitles: false,
        attributes: {
          title,
          visualizationType: 'lnsDatatable',
          type: 'lens',
          references: [ref(layerId)],
          state: {
            visualization: {
              layerId,
              layerType: 'data',
              columns: columnIds.map((columnId) => ({
                columnId,
                isTransposed: false,
              })),
            },
            datasourceStates: {
              formBased: {
                layers: {
                  [layerId]: {
                    columns: {
                      [colBucket]: {
                        label: bucketLabel,
                        dataType: 'string',
                        operationType: 'terms',
                        scale: 'ordinal',
                        sourceField: bucketField,
                        isBucketed: true,
                        params: {
                          size: 20,
                          orderBy: { type: 'column', columnId: firstMetricColId },
                          orderDirection: 'desc',
                          otherBucket: true,
                          missingBucket: false,
                          parentFormat: { id: 'terms' },
                          secondaryFields: [],
                        },
                        customLabel: true,
                      },
                      ...metricColumns,
                    },
                    columnOrder: columnIds,
                    incompleteColumns: {},
                  },
                },
              },
            },
            query: { query: filter ?? '', language: 'kuery' },
            filters: [],
          },
        },
        enhancements: {},
      },
    },
    references: [panelRef(panelId, layerId)],
  };
}

// ---------------------------------------------------------------------------
// ES field constants (OTel attributes stored by AgentBuilderSpanProcessor)
// ---------------------------------------------------------------------------

const ATTR = 'attributes';
const INPUT_TOKENS = `${ATTR}.gen_ai.usage.input_tokens`;
const OUTPUT_TOKENS = `${ATTR}.gen_ai.usage.output_tokens`;
const CACHED_TOKENS = `${ATTR}.gen_ai.usage.cached_input_tokens`;
const REQUEST_MODEL = `${ATTR}.gen_ai.request.model`;
const TOOL_NAME = `${ATTR}.gen_ai.tool.name`;
const AGENT_ID = `${ATTR}.elastic.agent.id`;
const SPAN_KIND = `${ATTR}.elastic.inference.span.kind`;

// KQL filters to scope panels to specific span kinds
const LLM_FILTER = `${SPAN_KIND}: "LLM"`;
const TOOL_FILTER = `${SPAN_KIND}: "TOOL"`;
const AGENT_FILTER = `${SPAN_KIND}: "AGENT"`;
const CONVERSE_FILTER = `name: "Converse"`;
const WORKFLOW_FILTER = `name: Workflow*`;

// ---------------------------------------------------------------------------
// Dashboard assembly
// ---------------------------------------------------------------------------

function buildOverviewDashboard() {
  let row = 0;

  // Row 0: Token usage metric cards (h=6)
  const inputTokens = buildMetricPanel({
    panelId: 'input-tokens',
    title: 'Input tokens',
    field: INPUT_TOKENS,
    operation: 'sum',
    x: 0,
    y: row,
    filter: LLM_FILTER,
  });

  const outputTokens = buildMetricPanel({
    panelId: 'output-tokens',
    title: 'Output tokens',
    field: OUTPUT_TOKENS,
    operation: 'sum',
    x: 12,
    y: row,
    filter: LLM_FILTER,
  });

  const cachedTokens = buildMetricPanel({
    panelId: 'cached-tokens',
    title: 'Cached input tokens',
    field: CACHED_TOKENS,
    operation: 'sum',
    x: 24,
    y: row,
    filter: LLM_FILTER,
  });

  const totalRequests = buildMetricPanel({
    panelId: 'total-requests',
    title: 'Total LLM requests',
    field: '',
    operation: 'count',
    x: 36,
    y: row,
    filter: LLM_FILTER,
  });

  row += 6;

  // Row 1: Token usage over time by model (h=15)
  const tokensOverTime = buildXYPanel({
    panelId: 'tokens-over-time',
    title: 'Token usage over time by model',
    valueField: INPUT_TOKENS,
    valueLabel: 'Input tokens',
    valueOperation: 'sum',
    splitField: REQUEST_MODEL,
    splitLabel: 'Model',
    x: 0,
    y: row,
    w: 48,
    h: 15,
    filter: LLM_FILTER,
  });

  row += 15;

  // Row 2: Conversation volume & latency (h=15)
  const conversationVolume = buildXYPanel({
    panelId: 'conversation-volume',
    title: 'Conversation volume over time',
    valueField: '',
    valueLabel: 'Conversations',
    valueOperation: 'count',
    splitField: AGENT_ID,
    splitLabel: 'Agent',
    x: 0,
    y: row,
    w: 24,
    h: 15,
    filter: CONVERSE_FILTER,
  });

  const conversationLatency = buildXYPanel({
    panelId: 'conversation-latency',
    title: 'Conversation avg duration over time',
    valueField: 'duration',
    valueLabel: 'Avg duration (ns)',
    valueOperation: 'average',
    splitField: AGENT_ID,
    splitLabel: 'Agent',
    x: 24,
    y: row,
    w: 24,
    h: 15,
    seriesType: 'line',
    filter: CONVERSE_FILTER,
  });

  row += 15;

  // Row 3: Agent execution overview (h=15)
  const agentExecutionVolume = buildXYPanel({
    panelId: 'agent-execution-volume',
    title: 'Agent executions over time',
    valueField: '',
    valueLabel: 'Executions',
    valueOperation: 'count',
    splitField: AGENT_ID,
    splitLabel: 'Agent',
    x: 0,
    y: row,
    w: 24,
    h: 15,
    filter: AGENT_FILTER,
  });

  const agentExecutionLatency = buildXYPanel({
    panelId: 'agent-execution-latency',
    title: 'Agent execution avg duration over time',
    valueField: 'duration',
    valueLabel: 'Avg duration (ns)',
    valueOperation: 'average',
    splitField: AGENT_ID,
    splitLabel: 'Agent',
    x: 24,
    y: row,
    w: 24,
    h: 15,
    seriesType: 'line',
    filter: AGENT_FILTER,
  });

  row += 15;

  // Row 4: Tool call frequency table + LLM request breakdown table (h=12)
  const toolCallTable = buildTablePanel({
    panelId: 'tool-calls',
    title: 'Tool call frequency',
    bucketField: TOOL_NAME,
    bucketLabel: 'Tool',
    metrics: [
      { id: 'total', label: 'Total calls', field: '', operation: 'count' },
      { id: 'avg-duration', label: 'Avg duration (ns)', field: 'duration', operation: 'average' },
    ],
    x: 0,
    y: row,
    filter: TOOL_FILTER,
  });

  const llmRequestTable = buildTablePanel({
    panelId: 'llm-requests',
    title: 'LLM request breakdown',
    bucketField: REQUEST_MODEL,
    bucketLabel: 'Model',
    metrics: [
      { id: 'total', label: 'Requests', field: '', operation: 'count' },
      { id: 'input', label: 'Input tokens', field: INPUT_TOKENS, operation: 'sum' },
      { id: 'output', label: 'Output tokens', field: OUTPUT_TOKENS, operation: 'sum' },
      { id: 'avg-duration', label: 'Avg duration (ns)', field: 'duration', operation: 'average' },
    ],
    x: 24,
    y: row,
    filter: LLM_FILTER,
  });

  row += 12;

  // Row 5: Workflow execution table (h=12)
  const workflowTable = buildTablePanel({
    panelId: 'workflows',
    title: 'Workflow execution breakdown',
    bucketField: 'name',
    bucketLabel: 'Workflow',
    metrics: [
      { id: 'total', label: 'Executions', field: '', operation: 'count' },
      { id: 'avg-duration', label: 'Avg duration (ns)', field: 'duration', operation: 'average' },
    ],
    x: 0,
    y: row,
    w: 48,
    filter: WORKFLOW_FILTER,
  });

  // -- Collect all panels and references ---------------------------------

  const allPanels = [
    inputTokens,
    outputTokens,
    cachedTokens,
    totalRequests,
    tokensOverTime,
    conversationVolume,
    conversationLatency,
    agentExecutionVolume,
    agentExecutionLatency,
    toolCallTable,
    llmRequestTable,
    workflowTable,
  ];

  const allReferences = allPanels.flatMap((p) => p.references);
  const panelsJSON = allPanels.map((p) => p.panel);

  return {
    type: 'dashboard',
    id: OVERVIEW_DASHBOARD_ID,
    managed: true,
    typeMigrationVersion: '8.9.0',
    coreMigrationVersion: '8.8.0',
    attributes: {
      title: '[Elastic] Agent Builder Overview',
      description:
        'Operational overview of Agent Builder: token usage, cost tracking, conversation volume, agent execution, tool calls, workflows, and LLM request breakdown.',
      version: 1,
      timeRestore: true,
      timeFrom: 'now-7d',
      timeTo: 'now',
      optionsJSON: JSON.stringify({
        useMargins: true,
        syncColors: false,
        syncCursor: true,
        syncTooltips: false,
        hidePanelTitles: false,
      }),
      panelsJSON: JSON.stringify(panelsJSON),
      kibanaSavedObjectMeta: {
        searchSourceJSON: JSON.stringify({
          filter: [],
          query: { query: '', language: 'kuery' },
        }),
      },
    },
    references: allReferences,
  };
}
