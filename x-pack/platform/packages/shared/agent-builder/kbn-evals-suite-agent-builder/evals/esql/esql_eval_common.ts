/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { EvaluationDataset, EvalsExecutorClient, Example, ExperimentTask } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator } from '@kbn/evals';
import { NL_TO_ESQL_ROUTE } from '@kbn/esql-types';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AgentBuilderEvaluationChatClient } from '../../src/chat_client';

export type DatasetMetadata = Record<string, unknown> & {
  query_intent?: string;
  scenario_id?: string;
  sample_dataset?: 'flights' | 'ecommerce' | 'logs' | 'logstash' | 'synthetic';
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  esql?: string;
};

export type EsqlEvalInput = Record<string, unknown> & {
  question: string;
};

export type EsqlEvalExample = Example<EsqlEvalInput, { query: string }, DatasetMetadata>;

export type EsqlToolDatasetExample = EsqlEvalExample;

export type EsqlRouteEvalExample = EsqlEvalExample;

export type EvaluateEsqlToolDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: { name: string; description: string; examples: EsqlEvalExample[] };
}) => Promise<void>;

export type EvaluateNlToEsqlRouteDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: { name: string; description: string; examples: EsqlEvalExample[] };
}) => Promise<void>;

interface ToolResult {
  data?: { esql?: string };
  type?: string;
}

interface ToolTaskOutput {
  results: unknown[];
  errors: unknown[];
  esql: string;
}

interface NlToEsqlRouteResponse {
  content?: string;
}

interface RouteTaskOutput {
  esql: string;
}

/**
 * NL → ES|QL via Agent Builder `generate_esql` (tool execution API).
 * Uses `indexExplorer` when no index is passed; same as pre-route evals.
 */
export function createEvaluateEsqlToolDataset({
  executorClient,
  chatClient,
  inferenceClient,
  log,
}: {
  executorClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): EvaluateEsqlToolDataset {
  return async function evaluateDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    const executeToolTask: ExperimentTask<EsqlEvalExample, ToolTaskOutput> = async ({ input }) => {
      if (!input?.question) {
        throw new Error('ES|QL tool eval example is missing input.question');
      }
      const response = await chatClient.executeTool({
        toolId: platformCoreTools.generateEsql,
        toolParams: { query: input.question },
      });

      const esql = (response.results as ToolResult[])
        .filter((r) => r.type === 'query')
        .map((r) => r.data?.esql)
        .filter(Boolean)
        .join('\n');

      return {
        results: response.results,
        errors: response.errors,
        esql,
      };
    };

    const esqlEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
      inferenceClient,
      log,
      predictionExtractor: (output) => (output as ToolTaskOutput).esql ?? '',
      groundTruthExtractor: (expected) => (expected as { query?: string } | undefined)?.query ?? '',
    });

    await executorClient.runExperiment(
      {
        dataset,
        task: executeToolTask,
      },
      [esqlEquivalenceEvaluator]
    );
  };
}

/**
 * NL → ES|QL via `POST /internal/esql/nl_to_esql` (same as the ES|QL editor NL box), including
 * route-specific instructions (e.g. omit default LIMIT) from `registerNLtoESQLRoute`.
 */
export function createEvaluateNlToEsqlRouteDataset({
  executorClient,
  fetch,
  inferenceClient,
  log,
}: {
  executorClient: EvalsExecutorClient;
  fetch: HttpHandler;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): EvaluateNlToEsqlRouteDataset {
  return async function evaluateDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    const executeRouteTask: ExperimentTask<EsqlEvalExample, RouteTaskOutput> = async ({
      input,
    }) => {
      if (!input?.question) {
        throw new Error('NL→ES|QL eval example is missing input.question');
      }
      const body = (await fetch(NL_TO_ESQL_ROUTE, {
        method: 'POST',
        body: JSON.stringify({ nlInstruction: input.question }),
      })) as NlToEsqlRouteResponse;

      const esql = typeof body?.content === 'string' ? body.content : '';

      return { esql };
    };

    const esqlEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
      inferenceClient,
      log,
      predictionExtractor: (output) => (output as RouteTaskOutput).esql ?? '',
      groundTruthExtractor: (expected) => (expected as { query?: string } | undefined)?.query ?? '',
    });

    await executorClient.runExperiment(
      {
        dataset,
        task: executeRouteTask,
      },
      [esqlEquivalenceEvaluator]
    );
  };
}
