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

export interface BuildAutomationSuggestionContextDeps {
  esClient: ElasticsearchClient;
  spaceId: string;
  request: KibanaRequest;
  workflows?: WorkflowEnablementApi;
}

const inspectSource = async (
  esClient: ElasticsearchClient,
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
      previewEsqlQuery(esClient, source.value, SOURCE_SAMPLE_SIZE),
    ]);

    return {
      ...source,
      row_count: preview.row_count,
      sample_documents: preview.sample_rows,
      ...(fieldsDescription ? { fields: fieldsDescription.allFields } : {}),
    };
  } catch (error) {
    return { ...source, inspection_error: error instanceof Error ? error.message : String(error) };
  }
};

const readAutomation = async (
  automation: AiIndexHttpItem['automations'][number],
  spaceId: string,
  request: KibanaRequest,
  workflows: WorkflowEnablementApi | undefined
): Promise<AiIndexAutomationContext> => {
  if (!workflows) {
    return { ...automation, fetch_error: 'Workflows management is not available.' };
  }

  try {
    const workflow = await workflows.getWorkflow(automation.value, spaceId, request);
    if (!workflow) {
      return { ...automation, fetch_error: 'Workflow was not found.' };
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
  const { patterns, signalCount } = await selectSignals(esClient, {
    destValue: aiIndex.dest.value,
    sources: aiIndex.sources,
    spaceId,
  });

  const countByTag = new Map<string, number>();
  for (const pattern of patterns) {
    countByTag.set(pattern.tag, (countByTag.get(pattern.tag) ?? 0) + pattern.count);
  }

  return {
    total: signalCount,
    by_tag: [...countByTag.entries()].map(([tag, count]) => ({ tag, count })),
  };
};

/**
 * Programmatically explores an AI index the way a reviewer setting it up would — its sources'
 * fields and a sample of their documents, its existing automations' definitions, how many traces
 * and signals it already has — so the agent reviewing it can decide rather than discover.
 */
export const buildAutomationSuggestionContext = async (
  aiIndex: AiIndexHttpItem,
  { esClient, spaceId, request, workflows }: BuildAutomationSuggestionContextDeps
): Promise<{
  sources: AiIndexSourceContext[];
  automations: AiIndexAutomationContext[];
  traces: AiIndexTraceContext[];
  signals_summary: AiIndexSignalsSummary;
}> => {
  const [sources, automations, traces, signalsSummary] = await Promise.all([
    Promise.all(aiIndex.sources.map((source) => inspectSource(esClient, source))),
    Promise.all(
      aiIndex.automations.map((automation) =>
        readAutomation(automation, spaceId, request, workflows)
      )
    ),
    Promise.all(aiIndex.traces.map((trace) => countTrace(esClient, trace, spaceId))),
    buildSignalsSummary(esClient, aiIndex, spaceId),
  ]);

  return { sources, automations, traces, signals_summary: signalsSummary };
};
