/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfig, MetricConfigESQL, XYConfigESQL } from '@kbn/lens-embeddable-utils';
import { AGENT_BUILDER_DATASET_FILTER, AGENT_BUILDER_TRACE_INDEX } from './constants';

const FROM = `FROM ${AGENT_BUILDER_TRACE_INDEX}`;

const DURATION_EVAL = '| EVAL duration_sec = duration / 1000000000.0';

type PrimaryEsqlMetric = Extract<MetricConfigESQL['metrics'][number], { type: 'primary' }>;

interface EsqlMetricOptions {
  title: string;
  query: string;
  column: string;
  format?: { decimals?: number; suffix?: string };
  color?: PrimaryEsqlMetric['color'];
}

function esqlMetric({ title, query, column, format, color }: EsqlMetricOptions): MetricConfigESQL {
  const metric: PrimaryEsqlMetric = {
    type: 'primary',
    column,
    label: column,
    ...(format
      ? {
          format: {
            type: 'number',
            decimals: format.decimals ?? 0,
            compact: false,
            ...(format.suffix !== undefined ? { suffix: format.suffix } : {}),
          },
        }
      : {}),
    ...(color ? { color } : {}),
  };

  return {
    type: 'metric',
    title,
    data_source: { type: 'esql', query },
    sampling: 1,
    ignore_global_filters: false,
    metrics: [metric],
  };
}

interface EsqlXyOptions {
  title: string;
  query: string;
  layerType: 'line' | 'bar' | 'area_stacked';
  x: string;
  y: string | string[];
  breakdownBy?: string;
}

function esqlXy({ title, query, layerType, x, y, breakdownBy }: EsqlXyOptions): XYConfigESQL {
  const yColumns = Array.isArray(y) ? y : [y];
  return {
    type: 'xy',
    title,
    layers: [
      {
        type: layerType,
        data_source: { type: 'esql', query },
        sampling: 1,
        ignore_global_filters: false,
        x: { column: x },
        y: yColumns.map((column) => ({ column })),
        ...(breakdownBy ? { breakdown_by: { column: breakdownBy } } : {}),
      },
    ],
  };
}

function converseBase(): string {
  return `${FROM}\n${AGENT_BUILDER_DATASET_FILTER}\n| WHERE name == "Converse"`;
}

function executeAgentBase(): string {
  return `${FROM}\n${AGENT_BUILDER_DATASET_FILTER}\n| WHERE name == "ExecuteAgent"`;
}

function toolBase(): string {
  return `${FROM}\n${AGENT_BUILDER_DATASET_FILTER}\n| WHERE STARTS_WITH(name, "Tool:")`;
}

function workflowBase(): string {
  return `${FROM}\n${AGENT_BUILDER_DATASET_FILTER}\n| WHERE name == "ExecuteWorkflow"`;
}

function chatCompleteBase(): string {
  return `${FROM}\n${AGENT_BUILDER_DATASET_FILTER}\n| WHERE name == "ChatComplete"`;
}

const conversationVolumeLatency: Record<string, LensApiConfig> = {
  'panels/converse-span-count-metric.json': esqlMetric({
    query: `${converseBase()}\n| STATS \`Converse Span Count\` = COUNT(*)`,
    column: 'Converse Span Count',
  }),
  'panels/converse-avg-duration-metric.json': esqlMetric({
    title: 'Converse Avg Duration (s)',
    query: `${converseBase()}\n${DURATION_EVAL}\n| STATS \`Converse Avg Duration (s)\` = ROUND(AVG(duration_sec), 2)`,
    column: 'Converse Avg Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/converse-p95-duration-metric.json': esqlMetric({
    title: 'Converse P95 Duration (s)',
    query: `${converseBase()}\n${DURATION_EVAL}\n| STATS \`Converse P95 Duration (s)\` = ROUND(PERCENTILE(duration_sec, 95), 2)`,
    column: 'Converse P95 Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/converse-max-duration-metric.json': esqlMetric({
    title: 'Converse Max Duration (s)',
    query: `${converseBase()}\n${DURATION_EVAL}\n| STATS \`Converse Max Duration (s)\` = ROUND(MAX(duration_sec), 2)`,
    column: 'Converse Max Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/converse-count-over-time.json': esqlXy({
    title: 'Converse Count Over Time',
    layerType: 'line',
    query: `${converseBase()}\n| STATS \`Converse Count\` = COUNT(*) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)\n| SORT \`Time\``,
    x: 'Time',
    y: 'Converse Count',
  }),
  'panels/converse-avg-duration-over-time.json': esqlXy({
    title: 'Converse Avg Duration Over Time',
    layerType: 'line',
    query: `${converseBase()}\n${DURATION_EVAL}\n| STATS \`Avg Duration (s)\` = ROUND(AVG(duration_sec), 2) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)\n| SORT \`Time\``,
    x: 'Time',
    y: 'Avg Duration (s)',
  }),
};

const agentExecution: Record<string, LensApiConfig> = {
  'panels/execute-agent-count-metric.json': esqlMetric({
    title: 'ExecuteAgent Count',
    query: `${executeAgentBase()}\n| STATS \`ExecuteAgent Count\` = COUNT(*)`,
    column: 'ExecuteAgent Count',
  }),
  'panels/execute-agent-avg-duration-metric.json': esqlMetric({
    title: 'ExecuteAgent Avg Duration (s)',
    query: `${executeAgentBase()}\n${DURATION_EVAL}\n| STATS \`ExecuteAgent Avg Duration (s)\` = ROUND(AVG(duration_sec), 2)`,
    column: 'ExecuteAgent Avg Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/execute-agent-p95-duration-metric.json': esqlMetric({
    title: 'ExecuteAgent P95 Duration (s)',
    query: `${executeAgentBase()}\n${DURATION_EVAL}\n| STATS \`ExecuteAgent P95 Duration (s)\` = ROUND(PERCENTILE(duration_sec, 95), 2)`,
    column: 'ExecuteAgent P95 Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/execute-agent-max-duration-metric.json': esqlMetric({
    title: 'ExecuteAgent Max Duration (s)',
    query: `${executeAgentBase()}\n${DURATION_EVAL}\n| STATS \`ExecuteAgent Max Duration (s)\` = ROUND(MAX(duration_sec), 2)`,
    column: 'ExecuteAgent Max Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/execute-agent-count-by-agent-over-time.json': esqlXy({
    title: 'ExecuteAgent Count by Agent Over Time',
    layerType: 'line',
    query: `${executeAgentBase()}\n| STATS \`Execution Count\` = COUNT(*) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Agent\` = attributes.elastic.agent.id\n| SORT \`Time\``,
    x: 'Time',
    y: 'Execution Count',
    breakdownBy: 'Agent',
  }),
  'panels/execute-agent-duration-by-agent-over-time.json': esqlXy({
    title: 'ExecuteAgent Avg Duration by Agent Over Time',
    layerType: 'line',
    query: `${executeAgentBase()}\n${DURATION_EVAL}\n| STATS \`Avg Duration (s)\` = ROUND(AVG(duration_sec), 2) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Agent\` = attributes.elastic.agent.id\n| SORT \`Time\``,
    x: 'Time',
    y: 'Avg Duration (s)',
    breakdownBy: 'Agent',
  }),
  'panels/execute-agent-count-by-agent-bar.json': esqlXy({
    title: 'ExecuteAgent Count by Agent',
    layerType: 'bar',
    query: `${executeAgentBase()}\n| STATS \`Execution Count\` = COUNT(*) BY \`Agent\` = attributes.elastic.agent.id\n| SORT \`Execution Count\` DESC`,
    x: 'Agent',
    y: 'Execution Count',
  }),
};

const toolCalls: Record<string, LensApiConfig> = {
  'panels/tool-total-count-metric.json': esqlMetric({
    title: 'Tool Span Count',
    query: `${toolBase()}\n| STATS \`Tool Span Count\` = COUNT(*)`,
    column: 'Tool Span Count',
  }),
  'panels/tool-error-count-metric.json': esqlMetric({
    title: 'Tool Error Count',
    query: `${toolBase()}\n| WHERE status.code == "Error"\n| STATS \`Tool Error Count\` = COUNT(*)`,
    column: 'Tool Error Count',
  }),
  'panels/tool-success-rate-metric.json': esqlMetric({
    title: 'Tool Span Success Rate %',
    query: `${toolBase()}\n| STATS total = COUNT(*), errors = COUNT(*) WHERE status.code == "Error"\n| EVAL \`Tool Span Success Rate %\` = ROUND((total - errors) / total * 100, 2)\n| KEEP \`Tool Span Success Rate %\``,
    column: 'Tool Span Success Rate %',
    format: { decimals: 2, suffix: '%' },
    color: {
      type: 'dynamic',
      range: 'absolute',
      steps: [
        { lt: 90, color: '#f6726a' },
        { gte: 90, lt: 99, color: '#fcd883' },
        { gte: 99, color: '#24c292' },
      ],
    },
  }),
  'panels/tool-avg-duration-metric.json': esqlMetric({
    title: 'Tool Avg Duration (s)',
    query: `${toolBase()}\n${DURATION_EVAL}\n| STATS \`Tool Avg Duration (s)\` = ROUND(AVG(duration_sec), 2)`,
    column: 'Tool Avg Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/tool-count-by-name-over-time.json': esqlXy({
    title: 'Tool Count by Name Over Time',
    layerType: 'line',
    query: `${toolBase()}\n| STATS \`Tool Count\` = COUNT(*) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Tool Name\` = name\n| SORT \`Time\``,
    x: 'Time',
    y: 'Tool Count',
    breakdownBy: 'Tool Name',
  }),
  'panels/tool-count-by-status-over-time.json': esqlXy({
    title: 'Tool Count by Status Over Time',
    layerType: 'line',
    query: `${toolBase()}\n| STATS \`Tool Count\` = COUNT(*) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Status\` = status.code\n| SORT \`Time\``,
    x: 'Time',
    y: 'Tool Count',
    breakdownBy: 'Status',
  }),
  'panels/tool-top-15-by-name.json': esqlXy({
    title: 'Top 15 Tools by Count',
    layerType: 'bar',
    query: `${toolBase()}\n| STATS \`Tool Count\` = COUNT(*) BY \`Tool Name\` = name\n| SORT \`Tool Count\` DESC\n| LIMIT 15`,
    x: 'Tool Name',
    y: 'Tool Count',
  }),
};

const workflowExecution: Record<string, LensApiConfig> = {
  'panels/workflow-total-count-metric.json': esqlMetric({
    title: 'Workflow Execution Count',
    query: `${workflowBase()}\n| STATS \`Workflow Execution Count\` = COUNT(*)`,
    column: 'Workflow Execution Count',
  }),
  'panels/workflow-avg-duration-metric.json': esqlMetric({
    title: 'Workflow Avg Duration (s)',
    query: `${workflowBase()}\n${DURATION_EVAL}\n| STATS \`Workflow Avg Duration (s)\` = ROUND(AVG(duration_sec), 2)`,
    column: 'Workflow Avg Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/workflow-p95-duration-metric.json': esqlMetric({
    title: 'Workflow P95 Duration (s)',
    query: `${workflowBase()}\n${DURATION_EVAL}\n| STATS \`Workflow P95 Duration (s)\` = ROUND(PERCENTILE(duration_sec, 95), 2)`,
    column: 'Workflow P95 Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/workflow-max-duration-metric.json': esqlMetric({
    title: 'Workflow Max Duration (s)',
    query: `${workflowBase()}\n${DURATION_EVAL}\n| STATS \`Workflow Max Duration (s)\` = ROUND(MAX(duration_sec), 2)`,
    column: 'Workflow Max Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/workflow-count-by-name-over-time.json': esqlXy({
    title: 'Workflow Count by Name Over Time',
    layerType: 'line',
    query: `${workflowBase()}\n| STATS \`Workflow Count\` = COUNT(*) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Workflow\` = attributes.workflow.name\n| SORT \`Time\``,
    x: 'Time',
    y: 'Workflow Count',
    breakdownBy: 'Workflow',
  }),
  'panels/workflow-avg-duration-over-time.json': esqlXy({
    title: 'Workflow Avg Duration Over Time',
    layerType: 'line',
    query: `${workflowBase()}\n${DURATION_EVAL}\n| STATS \`Avg Duration (s)\` = ROUND(AVG(duration_sec), 2) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)\n| SORT \`Time\``,
    x: 'Time',
    y: 'Avg Duration (s)',
  }),
  'panels/workflow-count-by-name-bar.json': esqlXy({
    title: 'Workflow Count by Name',
    layerType: 'bar',
    query: `${workflowBase()}\n| STATS \`Workflow Count\` = COUNT(*) BY \`Workflow\` = attributes.workflow.name\n| SORT \`Workflow Count\` DESC`,
    x: 'Workflow',
    y: 'Workflow Count',
  }),
};

const tokenUsageAndCost: Record<string, LensApiConfig> = {
  'panels/chatcomplete-total-cost-metric.json': esqlMetric({
    title: 'Total LLM Cost',
    query: `${chatCompleteBase()}\n| STATS \`Total Cost\` = ROUND(SUM(TO_DOUBLE(attributes.gen_ai.usage.cost)), 4)`,
    column: 'Total Cost',
    format: { decimals: 4 },
  }),
  'panels/chatcomplete-cost-over-time.json': esqlXy({
    title: 'LLM Cost Over Time by Model',
    layerType: 'line',
    query: `${chatCompleteBase()}\n| STATS \`Total Cost\` = ROUND(SUM(TO_DOUBLE(attributes.gen_ai.usage.cost)), 4) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Model\` = attributes.gen_ai.request.model\n| SORT \`Time\``,
    x: 'Time',
    y: 'Total Cost',
    breakdownBy: 'Model',
  }),
};

const llmRequests: Record<string, LensApiConfig> = {
  'panels/chatcomplete-total-count-metric.json': esqlMetric({
    title: 'ChatComplete Count',
    query: `${chatCompleteBase()}\n| STATS \`ChatComplete Count\` = COUNT(*)`,
    column: 'ChatComplete Count',
  }),
  'panels/chatcomplete-avg-duration-metric.json': esqlMetric({
    title: 'ChatComplete Avg Duration (s)',
    query: `${chatCompleteBase()}\n${DURATION_EVAL}\n| STATS \`ChatComplete Avg Duration (s)\` = ROUND(AVG(duration_sec), 2)`,
    column: 'ChatComplete Avg Duration (s)',
    format: { decimals: 2 },
  }),
  'panels/chatcomplete-total-input-tokens-metric.json': esqlMetric({
    title: 'Total Input Tokens',
    query: `${chatCompleteBase()}\n| STATS \`Total Input Tokens\` = SUM(TO_LONG(attributes.gen_ai.usage.input_tokens))`,
    column: 'Total Input Tokens',
  }),
  'panels/chatcomplete-total-output-tokens-metric.json': esqlMetric({
    title: 'Total Output Tokens',
    query: `${chatCompleteBase()}\n| STATS \`Total Output Tokens\` = SUM(TO_LONG(attributes.gen_ai.usage.output_tokens))`,
    column: 'Total Output Tokens',
  }),
  'panels/chatcomplete-count-by-model-over-time.json': esqlXy({
    title: 'ChatComplete Count by Model Over Time',
    layerType: 'line',
    query: `${chatCompleteBase()}\n| STATS \`ChatComplete Count\` = COUNT(*) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Model\` = attributes.gen_ai.request.model\n| SORT \`Time\``,
    x: 'Time',
    y: 'ChatComplete Count',
    breakdownBy: 'Model',
  }),
  'panels/chatcomplete-latency-by-provider-over-time.json': esqlXy({
    title: 'ChatComplete Avg Latency by Provider Over Time',
    layerType: 'line',
    query: `${chatCompleteBase()}\n${DURATION_EVAL}\n| STATS \`Avg Duration (s)\` = ROUND(AVG(duration_sec), 2) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Provider\` = attributes.gen_ai.system\n| SORT \`Time\``,
    x: 'Time',
    y: 'Avg Duration (s)',
    breakdownBy: 'Provider',
  }),
  'panels/chatcomplete-count-by-model-bar.json': esqlXy({
    title: 'ChatComplete Count by Model',
    layerType: 'bar',
    query: `${chatCompleteBase()}\n| STATS \`ChatComplete Count\` = COUNT(*) BY \`Model\` = attributes.gen_ai.request.model\n| SORT \`ChatComplete Count\` DESC`,
    x: 'Model',
    y: 'ChatComplete Count',
  }),
  'panels/chatcomplete-count-by-provider-bar.json': esqlXy({
    title: 'ChatComplete Count by Provider',
    layerType: 'bar',
    query: `${chatCompleteBase()}\n| STATS \`ChatComplete Count\` = COUNT(*) BY \`Provider\` = attributes.gen_ai.system\n| SORT \`ChatComplete Count\` DESC`,
    x: 'Provider',
    y: 'ChatComplete Count',
  }),
  'panels/chatcomplete-token-usage-over-time.json': esqlXy({
    title: 'Total Token Usage Over Time by Model',
    layerType: 'area_stacked',
    query: `${chatCompleteBase()}\n| STATS \`Total Tokens\` = SUM(TO_LONG(attributes.gen_ai.usage.input_tokens)) + SUM(TO_LONG(attributes.gen_ai.usage.output_tokens)) BY \`Time\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), \`Model\` = attributes.gen_ai.request.model`,
    x: 'Time',
    y: 'Total Tokens',
    breakdownBy: 'Model',
  }),
};

/** Maps overview-dashboard.json panel $ref paths to Lens API visualization configs. */
export const VISUALIZATION_BY_REF: Record<string, LensApiConfig> = {
  ...tokenUsageAndCost,
  ...llmRequests,
  ...conversationVolumeLatency,
  ...agentExecution,
  ...toolCalls,
  ...workflowExecution,
};
