/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createEsqlEquivalenceEvaluator,
  createTrajectoryEvaluator,
  getStringMeta,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type Example,
  type ExperimentTask,
} from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { VisualizationAgentEvaluationChatClient } from './chat_client';
import { extractVisualizationEsql, getToolIds } from './extract_visualization';
import { createEsqlValidityEvaluator } from './evaluators/esql_validity';
import { createEsqlExecutionEvaluator } from './evaluators/esql_execution';

export type VisualizationDatasetExample = Example<
  {
    question: string;
  },
  {
    /** Ground-truth ES|QL the generated visualization should be equivalent to. */
    query?: string;
    /** Natural-language description of the expected outcome. */
    expected?: string;
    /** Golden ordered tool path (e.g. `['load_skill', 'platform.core.create_visualization']`). */
    goldenToolPath?: string[];
  },
  {
    /** When `true`, the execution evaluator also scores hit-rate against real data. */
    includeHitDetection?: boolean;
    agentId?: string;
    [key: string]: unknown;
  }
>;

export interface VisualizationAgentTaskOutput {
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  /** Newline-joined ES|QL from every generated visualization (equivalence prediction). */
  esql: string;
  agentTraceId?: string;
  traceId?: string;
}

export type VisualizationAgentEvaluator = Evaluator<
  VisualizationDatasetExample,
  VisualizationAgentTaskOutput
>;

export type EvaluateDataset = ({
  dataset,
  evaluators,
}: {
  dataset: {
    name: string;
    description: string;
    examples: VisualizationDatasetExample[];
  };
  evaluators?: VisualizationAgentEvaluator[];
}) => Promise<void>;

const queryExtractor = (output: VisualizationAgentTaskOutput): string[] =>
  extractVisualizationEsql(output);

const predictionExtractor = (output: unknown): string =>
  (output as VisualizationAgentTaskOutput | undefined)?.esql ?? '';

const groundTruthExtractor = (expected: unknown): string =>
  (expected as { query?: string } | undefined)?.query ?? '';

// The framework trace-based evaluators resolve their OTel trace by `traceId`.
// The converse turn surfaces the agent trace under `agentTraceId`, so map it
// onto `traceId` before delegating (mirrors the dashboards suite).
const useAgentTraceId = (evaluator: Evaluator): VisualizationAgentEvaluator => ({
  ...evaluator,
  evaluate: async ({ input, output, expected, metadata }) =>
    evaluator.evaluate({
      input,
      output: {
        ...output,
        traceId: output.agentTraceId ?? output.traceId,
      },
      expected,
      metadata,
    }),
});

export function createEvaluateDataset({
  chatClient,
  evaluators,
  executorClient,
  inferenceClient,
  esClient,
  log,
}: {
  chatClient: VisualizationAgentEvaluationChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  esClient: EsClient;
  log: ToolingLog;
}): EvaluateDataset {
  const esqlValidityEvaluator = createEsqlValidityEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({ queryExtractor });

  const esqlExecutionEvaluator = createEsqlExecutionEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    esClient,
    queryExtractor,
    // Seed examples target real sample-data indices, so a correct
    // visualization query should return rows. Opt in per-example via
    // `metadata.includeHitDetection` to avoid penalising legitimately
    // empty results (e.g. narrow filters) in future datasets.
    includeHitDetection: ({ metadata }) => Boolean(metadata?.includeHitDetection),
  });

  const esqlEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
    inferenceClient,
    log,
    predictionExtractor,
    groundTruthExtractor,
  });

  const trajectoryEvaluator = createTrajectoryEvaluator({
    extractToolCalls: (output) => getToolIds(output as VisualizationAgentTaskOutput),
    goldenPathExtractor: (expected) =>
      (expected as { goldenToolPath?: string[] }).goldenToolPath ?? [],
    orderWeight: 0.4,
    coverageWeight: 0.6,
  });

  return async function evaluateDataset({
    dataset: { name, description, examples },
    evaluators: customEvaluators,
  }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    const task: ExperimentTask<VisualizationDatasetExample, VisualizationAgentTaskOutput> = async ({
      input,
      metadata,
    }) => {
      const agentId = getStringMeta(metadata, 'agentId');
      const response = await chatClient.converse({
        message: input?.question ?? '',
        ...(agentId ? { agentId } : {}),
      });

      return {
        errors: response.errors,
        messages: response.messages,
        steps: response.steps,
        esql: extractVisualizationEsql(response).join('\n'),
        agentTraceId: response.traceId,
      };
    };

    await executorClient.runExperiment({ datasets: [dataset], task }, [
      ...(customEvaluators ?? [
        esqlValidityEvaluator,
        esqlExecutionEvaluator,
        esqlEquivalenceEvaluator,
        trajectoryEvaluator,
      ]),
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}
