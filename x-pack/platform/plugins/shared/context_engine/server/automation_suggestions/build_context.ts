/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type {
  AiIndexAutomationContext,
  AiIndexSignalsSummary,
  AiIndexSourceContext,
  AiIndexTraceContext,
} from '../../common/ai_index_schemas';
import type { AiIndexHttpItem } from '../../common/http_api/ai_indices';
import { describeAiIndexFields } from '../ai_indices/describe_fields';
import { countEsqlRows, previewEsqlQuery } from '../ai_indices/esql_preview';
import { buildTraceQueries } from '../ai_indices/trace_queries';
import type { WorkflowEnablementApi } from '../feedback_analysis/schedule';
import { selectSignals } from '../feedback_analysis/select_signals';
import { parseFromClause } from '../tasks/transform';

/** Documents sampled per source, enough to judge whether a field is populated without flooding the prompt. */
const SOURCE_SAMPLE_SIZE = 5;
/** Keeps a few large sampled fields from pushing the attachment past the request size limit. */
const MAX_SAMPLE_VALUE_LENGTH = 500;
/** Left out rather than cut: a truncated workflow looks complete and could be saved back damaged. */
const MAX_WORKFLOW_YAML_LENGTH = 32_000;

export interface BuildAutomationSuggestionContextDeps {
  esClient: ElasticsearchClient;
  spaceId: string;
  request: KibanaRequest;
  canReadWorkflows: boolean;
  workflows?: WorkflowEnablementApi;
}

const truncateSampleValue = (value: unknown): unknown =>
  typeof value === 'string' && value.length > MAX_SAMPLE_VALUE_LENGTH
    ? `${value.slice(0, MAX_SAMPLE_VALUE_LENGTH)}… [truncated from ${value.length} characters]`
    : value;

const truncateSampleRow = (row: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key, truncateSampleValue(value)]));

const inspectSource = async (
  esClient: ElasticsearchClient,
  spaceId: string,
  source: AiIndexHttpItem['sources'][number]
): Promise<AiIndexSourceContext> => {
  if (source.type === 'connector') {
    // Connector contents are not queryable from here; the agent reaching this skill already knows
    // to say it cannot inspect one rather than guess.
    return source;
  }

  try {
    const target = parseFromClause(source.value);
    const [fieldsDescription, preview] = await Promise.all([
      target
        ? describeAiIndexFields({ esClient, target }).catch(() => undefined)
        : Promise.resolve(undefined),
      previewEsqlQuery(esClient, source.value, SOURCE_SAMPLE_SIZE, spaceId),
    ]);

    return {
      ...source,
      row_count: preview.row_count,
      sample_documents: preview.sample_rows.map(truncateSampleRow),
      ...(fieldsDescription ? { fields: fieldsDescription.allFields } : {}),
    };
  } catch (error) {
    return { ...source, inspection_error: error instanceof Error ? error.message : String(error) };
  }
};

const readAutomation = async (
  automation: AiIndexHttpItem['automations'][number],
  {
    spaceId,
    request,
    canReadWorkflows,
    workflows,
  }: Omit<BuildAutomationSuggestionContextDeps, 'esClient'>
): Promise<AiIndexAutomationContext> => {
  if (!canReadWorkflows) {
    return { ...automation, fetch_error: 'The Workflows read privilege is required.' };
  }
  if (!workflows) {
    return { ...automation, fetch_error: 'Workflows management is not available.' };
  }

  try {
    const workflow = await workflows.getWorkflow(automation.value, spaceId, request);
    if (!workflow) {
      return { ...automation, fetch_error: 'Workflow was not found.' };
    }
    if (workflow.yaml.length > MAX_WORKFLOW_YAML_LENGTH) {
      return {
        ...automation,
        fetch_error: `Workflow definition exceeds ${MAX_WORKFLOW_YAML_LENGTH} characters and was not included; use get_workflow.`,
      };
    }
    return { ...automation, yaml: workflow.yaml };
  } catch (error) {
    return { ...automation, fetch_error: error instanceof Error ? error.message : String(error) };
  }
};

const countTrace = async (
  esClient: ElasticsearchClient,
  trace: AiIndexHttpItem['traces'][number],
  spaceId: string
): Promise<AiIndexTraceContext> => {
  const [{ query }] = buildTraceQueries([trace], spaceId);
  try {
    return { ...trace, query, row_count: await countEsqlRows(esClient, query) };
  } catch (error) {
    return { ...trace, query, count_error: error instanceof Error ? error.message : String(error) };
  }
};

const buildSignalsSummary = async (
  esClient: ElasticsearchClient,
  aiIndex: AiIndexHttpItem,
  spaceId: string
): Promise<AiIndexSignalsSummary> => {
  const { tagCounts, signalCount } = await selectSignals(esClient, {
    destValue: aiIndex.dest.value,
    sources: aiIndex.sources,
    spaceId,
  });

  return { total: signalCount, by_tag: tagCounts };
};

/**
 * Programmatically explores an AI index the way a reviewer setting it up would — its sources'
 * fields and a sample of their documents, its existing automations' definitions, how many traces
 * and signals it already has — so the agent reviewing it can decide rather than discover.
 */
export const buildAutomationSuggestionContext = async (
  aiIndex: AiIndexHttpItem,
  { esClient, spaceId, request, workflows, canReadWorkflows }: BuildAutomationSuggestionContextDeps
): Promise<{
  sources: AiIndexSourceContext[];
  automations: AiIndexAutomationContext[];
  traces: AiIndexTraceContext[];
  signals_summary: AiIndexSignalsSummary;
}> => {
  const automationDeps = { spaceId, request, workflows, canReadWorkflows };
  const [sources, automations, traces, signalsSummary] = await Promise.all([
    Promise.all(aiIndex.sources.map((source) => inspectSource(esClient, spaceId, source))),
    Promise.all(
      aiIndex.automations.map((automation) => readAutomation(automation, automationDeps))
    ),
    Promise.all(aiIndex.traces.map((trace) => countTrace(esClient, trace, spaceId))),
    buildSignalsSummary(esClient, aiIndex, spaceId),
  ]);

  return { sources, automations, traces, signals_summary: signalsSummary };
};
