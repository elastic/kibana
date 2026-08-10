/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createCalibratedEsqlEquivalenceEvaluator,
  createEsqlExecutionEvaluator,
  createTrajectoryEvaluator,
  getStringMeta,
  type AgentBuilderClient,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type Example,
  type ExperimentTask,
} from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { extractVisualizationEsql, getToolIds } from './extract_visualization';
import { visualizationSkillActivatedEvaluator } from './skill_selection_evaluators';

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
  additionalEvaluators,
}: {
  dataset: {
    name: string;
    description: string;
    examples: VisualizationDatasetExample[];
  };
  /** Replaces the default evaluator set when provided. */
  evaluators?: VisualizationAgentEvaluator[];
  /** Appended alongside the default (or custom) evaluator set. */
  additionalEvaluators?: VisualizationAgentEvaluator[];
}) => Promise<void>;

// The converse turn surfaces the agent trace under `agentTraceId`; the
// framework trace-based evaluators look for `traceId` — remap before delegating.
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
  agentBuilderClient,
  agentId: defaultAgentId,
  evaluators,
  executorClient,
  inferenceClient,
  esClient,
  log,
}: {
  agentBuilderClient: AgentBuilderClient;
  agentId: string;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  inferenceClient: BoundInferenceClient;
  esClient: EsClient;
  log: ToolingLog;
}): EvaluateDataset {
  // Execution already AST-validates via `@kbn/esql-language`, so a separate
  // validity evaluator is omitted from the default set.
  const esqlExecutionEvaluator = createEsqlExecutionEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    esClient,
    queryExtractor: extractVisualizationEsql,
    // Per-example opt-in so future examples with legitimately empty results aren't penalised.
    includeHitDetection: ({ metadata }) => Boolean(metadata?.includeHitDetection),
  });

  const esqlEquivalenceEvaluator = createCalibratedEsqlEquivalenceEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    inferenceClient,
    log,
    predictionExtractor: (output) => output.esql ?? '',
    groundTruthExtractor: (expected) => expected?.query ?? '',
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
    additionalEvaluators,
  }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    const task: ExperimentTask<VisualizationDatasetExample, VisualizationAgentTaskOutput> = async ({
      input,
      metadata,
    }) => {
      const agentId = getStringMeta(metadata, 'agentId') ?? defaultAgentId;
      const response = await agentBuilderClient.converse({
        agentId,
        input: input?.question ?? '',
      });

      return {
        errors: [],
        messages: [{ message: response.message }],
        steps: response.steps,
        esql: extractVisualizationEsql(response).join('\n'),
        agentTraceId: response.traceId,
      };
    };

    await executorClient.runExperiment({ datasets: [dataset], task }, [
      ...(customEvaluators ?? [
        visualizationSkillActivatedEvaluator,
        esqlExecutionEvaluator,
        esqlEquivalenceEvaluator,
        trajectoryEvaluator,
      ]),
      ...(additionalEvaluators ?? []),
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}
