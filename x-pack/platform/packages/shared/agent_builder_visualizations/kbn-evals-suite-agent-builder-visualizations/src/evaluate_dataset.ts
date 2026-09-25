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
import {
  extractVisualizations,
  getToolIds,
  type ExtractedVisualization,
} from './extract_visualization';
import { createChartCompatibleResultEvaluator } from './evaluators/chart_compatible_result';
import { createColumnBindingIntegrityEvaluator } from './evaluators/column_binding_integrity';
import {
  createChartIntentJudge,
  createChartTypeVsIntentEvaluator,
} from './evaluators/chart_type_vs_intent';
import { skipRefusalExamples, withLowScoreLogging } from './evaluator_utils';
import { createEsqlExecutionEvaluator } from './evaluators/esql_execution';
import { createEsqlQueryRunner } from './evaluators/esql_query_runner';
import { createCalibratedEsqlEquivalenceEvaluator } from './evaluators/esql_functional_equivalence';
import { createEsqlResultEquivalenceEvaluator } from './evaluators/esql_result_equivalence';
import {
  extractGoldChartForm,
  extractGoldChartType,
  extractGoldQuery,
  extractGoldRenderer,
  type VisualizationGoldConfig,
} from './evaluators/gold_visualization_config';
import { createRendererVsIntentEvaluator } from './evaluators/renderer_vs_intent';
import { createVisualizationConfigValidityEvaluator } from './evaluators/visualization_config_validity';
import { createVisualizationConfigVsIntentEvaluator } from './evaluators/visualization_config_vs_intent';
import {
  createVisualizationRefusalEvaluator,
  type ExpectedRefusal,
} from './evaluators/visualization_refusal';

export type { VisualizationGoldConfig };

export type VisualizationDatasetExample = Example<
  {
    question: string;
    /** Second turn in the same conversation; evaluators score the visualization it produces. */
    followUp?: string;
  },
  {
    /**
     * Partial Lens Config API (or Vega spec skeleton). Gold ES|QL lives in
     * `data_source.query` / `layers[].data_source.query`. Chart type is `type`.
     */
    config?: VisualizationGoldConfig;
    /** Golden ordered tool path (e.g. `['load_skill', 'platform.core.create_visualization']`). */
    goldenToolPath?: string[];
    /** Expected renderer when the example intentionally forces Lens or Vega. */
    renderer?: 'lens' | 'vega';
    /** Set on negative examples: the agent should decline instead of drawing. */
    refusal?: ExpectedRefusal;
  },
  {
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
  /** Structured visualization payloads for chart-type / config evaluators. */
  visualizations: ExtractedVisualization[];
  agentTraceId?: string;
  traceId?: string;
  /** Number of converse turns the task ran (1, or 2 for edit examples). */
  turns: number;
  /** Structured prompts the agent asked the user (clarifying questions, confirmations). */
  prompts: unknown[];
}

export type VisualizationAgentEvaluator = Evaluator<
  VisualizationDatasetExample,
  VisualizationAgentTaskOutput
>;

/** The full user intent for judges: the opening request plus any follow-up edit. */
export const describeRequest = (input: VisualizationDatasetExample['input']): string =>
  [input?.question, input?.followUp ? `Follow-up: ${input.followUp}` : undefined]
    .filter((part): part is string => Boolean(part))
    .join('\n');

export type EvaluateDataset = ({
  dataset,
}: {
  dataset: {
    name: string;
    description: string;
    examples: VisualizationDatasetExample[];
  };
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
  const buildEvaluators = () => {
    const visualizationExtractor = (output: VisualizationAgentTaskOutput) =>
      output.visualizations ?? extractVisualizations(output);

    // Four evaluators execute the candidate ES|QL; one runner means each query runs once.
    // Built per dataset run so cached results never outlive the fixtures a spec's
    // beforeAll (re)installs.
    const runQuery = createEsqlQueryRunner(esClient);

    const esqlExecutionEvaluator = createEsqlExecutionEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      runQuery,
      // Last-turn visualizations only; `output.steps` also carries the first turn of edit examples.
      queryExtractor: (output) =>
        visualizationExtractor(output)
          .map((visualization) => visualization.esql)
          .filter((esql) => esql.length > 0),
      includeHitDetection: true,
    });

    const esqlEquivalenceEvaluator = createCalibratedEsqlEquivalenceEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      inferenceClient,
      log,
      predictionExtractor: (output) => output.esql ?? '',
      groundTruthExtractor: (expected) => extractGoldQuery(expected),
    });

    const esqlResultEquivalenceEvaluator = createEsqlResultEquivalenceEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      runQuery,
      predictionExtractor: (output) =>
        visualizationExtractor(output).map((visualization) => visualization.esql),
      groundTruthExtractor: (expected) => extractGoldQuery(expected),
    });

    const chartTypeVsIntentEvaluator = createChartTypeVsIntentEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      visualizationExtractor,
      questionExtractor: describeRequest,
      expectedChartFormExtractor: (expected) => extractGoldChartForm(expected),
      judge: createChartIntentJudge({ inferenceClient, log }),
    });

    const rendererVsIntentEvaluator = createRendererVsIntentEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      visualizationExtractor,
      expectedRendererExtractor: (expected) => extractGoldRenderer(expected),
    });

    const visualizationConfigValidityEvaluator = createVisualizationConfigValidityEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      visualizationExtractor,
    });

    const visualizationConfigVsIntentEvaluator = createVisualizationConfigVsIntentEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      visualizationExtractor,
      expectedConfigExtractor: (expected) => expected?.config,
    });

    const columnBindingIntegrityEvaluator = createColumnBindingIntegrityEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      runQuery,
      visualizationExtractor,
    });

    const chartCompatibleResultEvaluator = createChartCompatibleResultEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      runQuery,
      visualizationExtractor,
      expectedChartTypeExtractor: (expected) => extractGoldChartType(expected),
    });

    const visualizationRefusalEvaluator = createVisualizationRefusalEvaluator<
      VisualizationDatasetExample,
      VisualizationAgentTaskOutput
    >({
      visualizationExtractor,
      messagesExtractor: (output) => output.messages.map(({ message }) => message),
      promptsExtractor: (output) => output.prompts,
      expectedRefusalExtractor: (expected) => expected?.refusal,
    });

    const trajectoryEvaluator = createTrajectoryEvaluator({
      extractToolCalls: (output) => getToolIds(output as VisualizationAgentTaskOutput),
      goldenPathExtractor: (expected) =>
        (expected as VisualizationDatasetExample['output'])?.goldenToolPath ?? [],
      orderWeight: 0.4,
      coverageWeight: 0.6,
    });

    return {
      esqlExecutionEvaluator,
      esqlEquivalenceEvaluator,
      esqlResultEquivalenceEvaluator,
      chartTypeVsIntentEvaluator,
      rendererVsIntentEvaluator,
      visualizationConfigValidityEvaluator,
      visualizationConfigVsIntentEvaluator,
      columnBindingIntegrityEvaluator,
      chartCompatibleResultEvaluator,
      visualizationRefusalEvaluator,
      trajectoryEvaluator,
    };
  };

  return async function evaluateDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;
    const {
      esqlExecutionEvaluator,
      esqlEquivalenceEvaluator,
      esqlResultEquivalenceEvaluator,
      chartTypeVsIntentEvaluator,
      rendererVsIntentEvaluator,
      visualizationConfigValidityEvaluator,
      visualizationConfigVsIntentEvaluator,
      columnBindingIntegrityEvaluator,
      chartCompatibleResultEvaluator,
      visualizationRefusalEvaluator,
      trajectoryEvaluator,
    } = buildEvaluators();

    const task: ExperimentTask<VisualizationDatasetExample, VisualizationAgentTaskOutput> = async ({
      input,
      metadata,
    }) => {
      const agentId = getStringMeta(metadata, 'agentId') ?? defaultAgentId;
      const first = await agentBuilderClient.converse({
        agentId,
        input: input?.question ?? '',
      });

      // Edit examples continue the conversation; only the edited chart is scored,
      // but the trajectory sees the tool calls of both turns.
      const followUp = input?.followUp;
      if (followUp && !first.conversationId) {
        // Without the id the edit would start a fresh conversation and score as an
        // agent failure; fail the task so the harness problem is visible instead.
        throw new Error(
          `First turn returned no conversationId; cannot run follow-up "${followUp}"`
        );
      }
      const last = followUp
        ? await agentBuilderClient.converse({
            agentId,
            input: followUp,
            conversationId: first.conversationId,
          })
        : first;

      const visualizations = extractVisualizations(last);

      return {
        errors: [],
        messages: [{ message: last.message }],
        steps: [...(first.steps ?? []), ...(followUp ? last.steps ?? [] : [])],
        visualizations,
        esql: visualizations
          .map((visualization) => visualization.esql)
          .filter((esql) => esql.length > 0)
          .join('\n'),
        agentTraceId: last.traceId,
        turns: followUp ? 2 : 1,
        prompts: last.prompts ?? [],
      };
    };

    const isRefusalExample = (expected: VisualizationDatasetExample['output']) =>
      expected?.refusal !== undefined;
    const positiveOnly = (evaluator: VisualizationAgentEvaluator) =>
      skipRefusalExamples(evaluator, isRefusalExample);

    // Quality evaluators score 0..1 and get low-score logging; trace-based
    // evaluators report counts and seconds, so a "low" value means nothing there.
    const qualityEvaluators = [
      positiveOnly(esqlExecutionEvaluator),
      positiveOnly(esqlEquivalenceEvaluator),
      positiveOnly(esqlResultEquivalenceEvaluator),
      positiveOnly(chartTypeVsIntentEvaluator),
      positiveOnly(rendererVsIntentEvaluator),
      positiveOnly(visualizationConfigValidityEvaluator),
      positiveOnly(visualizationConfigVsIntentEvaluator),
      positiveOnly(columnBindingIntegrityEvaluator),
      positiveOnly(chartCompatibleResultEvaluator),
      visualizationRefusalEvaluator,
      positiveOnly(trajectoryEvaluator),
    ].map((evaluator) => withLowScoreLogging(evaluator, log));

    await executorClient.runExperiment({ datasets: [dataset], task }, [
      ...qualityEvaluators,
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}
