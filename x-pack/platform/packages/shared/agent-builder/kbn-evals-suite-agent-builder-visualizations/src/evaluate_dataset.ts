/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createTrajectoryEvaluator,
  getStringMeta,
  withEvaluatorSpan,
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
import { createEsqlResultEquivalenceEvaluator } from './evaluators/esql_result_equivalence';
import { createCalibratedEsqlEquivalenceEvaluator } from './evaluators/esql_functional_equivalence';
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
  // Each ES|QL evaluator is wrapped in a named `withEvaluatorSpan` so its
  // work shows up as a discrete span on the task's trace (mirrors the
  // security ES|QL regression suite), making per-evaluator latency and
  // failures observable in the golden cluster.
  const baseValidityEvaluator = createEsqlValidityEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({ queryExtractor });

  const esqlValidityEvaluator: VisualizationAgentEvaluator = {
    ...baseValidityEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlValidity', {}, () => baseValidityEvaluator.evaluate(args)),
  };

  const baseExecutionEvaluator = createEsqlExecutionEvaluator<
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

  const esqlExecutionEvaluator: VisualizationAgentEvaluator = {
    ...baseExecutionEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlExecution', {}, () => baseExecutionEvaluator.evaluate(args)),
  };

  // Calibrated three-point LLM judge (ported from the security ES|QL
  // regression suite) replaces the framework's binary Yes/No default.
  // Cosmetic-but-imperfect visualization queries (column-alias differences,
  // interchangeable bucketing granularity, `?_tstart`/`?_tend` vs literal
  // ranges) earn partial credit instead of a hard 0. Same evaluator name +
  // a `judgeVersion` metadata stamp keep golden-cluster history continuous.
  const baseEquivalenceEvaluator = createCalibratedEsqlEquivalenceEvaluator({
    inferenceClient,
    log,
    predictionExtractor,
    groundTruthExtractor,
  });

  const esqlEquivalenceEvaluator: Evaluator = {
    ...baseEquivalenceEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlFunctionalEquivalence', {}, () =>
        baseEquivalenceEvaluator.evaluate(args)
      ),
  };

  // Deterministic complement to the LLM judge: executes gold + candidate and
  // compares result rows via Jaccard similarity. Ignores row order and
  // rounds floats so aggregation/precision drift doesn't spuriously fail.
  const baseResultEquivalenceEvaluator = createEsqlResultEquivalenceEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    esClient,
    predictionExtractor,
    groundTruthExtractor,
    // Visualization queries differ cosmetically in output shape (column
    // aliases via RENAME, reordering via KEEP). Compare rows as unordered
    // value multisets so those differences don't produce a spurious 0.
    normalize: { ignoreColumnIdentity: true },
  });

  const esqlResultEquivalenceEvaluator: VisualizationAgentEvaluator = {
    ...baseResultEquivalenceEvaluator,
    evaluate: (args) =>
      withEvaluatorSpan('EsqlResultEquivalence', {}, () =>
        baseResultEquivalenceEvaluator.evaluate(args)
      ),
  };

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
        visualizationSkillActivatedEvaluator,
        esqlValidityEvaluator,
        esqlExecutionEvaluator,
        esqlEquivalenceEvaluator,
        esqlResultEquivalenceEvaluator,
        trajectoryEvaluator,
      ]),
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}
