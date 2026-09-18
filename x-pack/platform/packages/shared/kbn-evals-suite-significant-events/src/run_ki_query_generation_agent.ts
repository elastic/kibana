/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';
import {
  EMPTY_TOKENS,
  type AnalysisTarget,
  type QueryAttempt,
  type SignificantEventsToolUsage,
} from '@kbn/nightshift-ai';
import { createAgentBuilderClient, type ConverseStep } from '@kbn/evals';
import {
  KI_QUERY_GENERATION_AGENT_ID,
  SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
  buildKIQueryGenerationUserMessage,
  type AcceptedQuery,
} from '@kbn/significant-events-plugin/server';

export interface RunKIQueryGenerationAgentParams {
  fetch: HttpHandler;
  log: ToolingLog;
  target: AnalysisTarget;
  connectorId: string;
  groundingContext?: string;
}

export interface RunKIQueryGenerationAgentResult {
  queries: AcceptedQuery[];
  queryAttempts: QueryAttempt[];
  tokensUsed: ChatCompletionTokenCount;
  toolUsage: SignificantEventsToolUsage;
}

const GET_FEATURES_STEP_TOOL_ID = 'platform_sig_events_ki_features_get';
const normalizedToolId = (toolId: string): string => toolId.replaceAll('.', '_');

/** Adapts Agent Builder tool events to the legacy evaluator telemetry shape. */
export const computeToolUsage = (steps: ConverseStep[]): SignificantEventsToolUsage => {
  const usageFor = (
    toolId: string,
    isSuccess: (data: Record<string, unknown>) => boolean,
    shouldCount: (step: ConverseStep) => boolean = () => true
  ) => {
    const calls = steps.filter(
      (step) =>
        step.type === 'tool_call' &&
        typeof step.tool_id === 'string' &&
        normalizedToolId(step.tool_id) === normalizedToolId(toolId) &&
        shouldCount(step)
    );
    const failures = calls.filter(
      (step) =>
        !step.results?.some(
          (result) =>
            typeof result === 'object' &&
            result !== null &&
            'data' in result &&
            typeof (result as { data: unknown }).data === 'object' &&
            (result as { data: unknown }).data !== null &&
            isSuccess((result as { data: Record<string, unknown> }).data)
        )
    ).length;
    return { calls: calls.length, failures, latency_ms: 0 };
  };

  return {
    get_stream_features: usageFor(GET_FEATURES_STEP_TOOL_ID, (data) =>
      Array.isArray(data.features)
    ),
    add_queries: usageFor(
      SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID,
      (data) => data.finalized === true && Array.isArray(data.finalized_queries),
      (step) =>
        (typeof step.params === 'object' &&
          step.params !== null &&
          'queries' in step.params &&
          Array.isArray(step.params.queries) &&
          step.params.queries.length > 0) ||
        Boolean(
          step.results?.some(
            (result) =>
              typeof result === 'object' &&
              result !== null &&
              'data' in result &&
              typeof result.data === 'object' &&
              result.data !== null &&
              'finalized_queries' in result.data &&
              Array.isArray(result.data.finalized_queries) &&
              result.data.finalized_queries.length > 0
          )
        )
    ),
  };
};

const isQueryAttemptStatus = (status: unknown): status is QueryAttempt['status'] =>
  status === 'Added' || status === 'Duplicate' || status === 'Failed to add';

export const collectQueryAttempts = (steps: ConverseStep[]): QueryAttempt[] =>
  steps
    .filter(
      (step) =>
        step.type === 'tool_call' &&
        typeof step.tool_id === 'string' &&
        normalizedToolId(step.tool_id) ===
          normalizedToolId(SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID)
    )
    .flatMap((step) => step.results ?? [])
    .flatMap((result) => {
      if (
        typeof result !== 'object' ||
        result === null ||
        !('data' in result) ||
        typeof result.data !== 'object' ||
        result.data === null ||
        !('queries' in result.data) ||
        !Array.isArray(result.data.queries)
      ) {
        return [];
      }

      return result.data.queries.flatMap((validationResult): QueryAttempt[] => {
        if (
          typeof validationResult !== 'object' ||
          validationResult === null ||
          !('query' in validationResult) ||
          typeof validationResult.query !== 'object' ||
          validationResult.query === null ||
          !('title' in validationResult.query) ||
          typeof validationResult.query.title !== 'string' ||
          !('esql' in validationResult.query) ||
          typeof validationResult.query.esql !== 'string' ||
          !('status' in validationResult) ||
          !isQueryAttemptStatus(validationResult.status)
        ) {
          return [];
        }

        const query = validationResult.query as {
          title: string;
          esql: string;
          replaces?: string;
        };
        const attempt: QueryAttempt = {
          title: query.title,
          esql: query.esql,
          status: validationResult.status,
        };
        if (typeof query.replaces === 'string') {
          attempt.replaces = query.replaces;
        }
        if (
          'exactDuplicate' in validationResult &&
          typeof validationResult.exactDuplicate === 'boolean'
        ) {
          attempt.exactDuplicate = validationResult.exactDuplicate;
        }
        if (
          'failureReason' in validationResult &&
          (validationResult.failureReason === 'missing_intent' ||
            validationResult.failureReason === 'unknown_features' ||
            validationResult.failureReason === 'validation_error')
        ) {
          attempt.failureReason = validationResult.failureReason;
        }
        return [attempt];
      });
    });

const isFinalizedValidationResult = (
  result: unknown
): result is { data: { finalized: true; finalized_queries: AcceptedQuery[] } } =>
  typeof result === 'object' &&
  result !== null &&
  'data' in result &&
  typeof result.data === 'object' &&
  result.data !== null &&
  'finalized' in result.data &&
  result.data.finalized === true &&
  'finalized_queries' in result.data &&
  Array.isArray(result.data.finalized_queries);

export const getFinalizedQueries = (steps: ConverseStep[]): AcceptedQuery[] => {
  const validationStep = steps
    .filter(
      (step) =>
        step.type === 'tool_call' &&
        typeof step.tool_id === 'string' &&
        normalizedToolId(step.tool_id) ===
          normalizedToolId(SIGNIFICANT_EVENTS_VALIDATE_QUERIES_TOOL_ID)
    )
    .at(-1);
  const validationResult = validationStep?.results?.find(isFinalizedValidationResult);
  if (!validationResult) {
    throw new Error('KI query generation agent did not finalize validate_queries');
  }
  return validationResult.data.finalized_queries;
};

export async function runKIQueryGenerationAgent({
  fetch,
  log,
  target,
  connectorId,
  groundingContext,
}: RunKIQueryGenerationAgentParams): Promise<RunKIQueryGenerationAgentResult> {
  const agentBuilderClient = createAgentBuilderClient({ fetch, log, connectorId });
  const conversation = await agentBuilderClient.createConversation({
    agentId: KI_QUERY_GENERATION_AGENT_ID,
    title: `KI query generation: ${target.name}`,
  });
  const userMessage = [buildKIQueryGenerationUserMessage(target), groundingContext]
    .filter((part): part is string => Boolean(part))
    .join('\n\n');
  const result = await agentBuilderClient.converse({
    agentId: KI_QUERY_GENERATION_AGENT_ID,
    conversationId: conversation.id,
    input: userMessage,
  });
  const queries = getFinalizedQueries(result.steps);
  return {
    queries,
    queryAttempts: collectQueryAttempts(result.steps),
    tokensUsed: result.tokensUsed ?? { ...EMPTY_TOKENS },
    toolUsage: computeToolUsage(result.steps),
  };
}
