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
  extractVisualizationEsql,
  extractVisualizations,
  getToolIds,
  type ExtractedVisualization,
} from './extract_visualization';
import { createChartCompatibleResultEvaluator } from './evaluators/chart_compatible_result';
import { createChartTypeVsIntentEvaluator } from './evaluators/chart_type_vs_intent';
import { createEsqlExecutionEvaluator } from './evaluators/esql_execution';
import { createCalibratedEsqlEquivalenceEvaluator } from './evaluators/esql_functional_equivalence';
import { createRendererVsIntentEvaluator } from './evaluators/renderer_vs_intent';
import { createVisualizationConfigValidityEvaluator } from './evaluators/visualization_config_validity';

export type VisualizationDatasetExample = Example<
  {
    question: string;
  },
  {
    /** Ground-truth ES|QL the generated visualization should be equivalent to. */
    query?: string;
    /** Golden ordered tool path (e.g. `['load_skill', 'platform.core.create_visualization']`). */
    goldenToolPath?: string[];
    /**
     * Expected Lens `chart_type` (or acceptable alternatives). Bar/line/area
     * requests map to `xy`. Omit for Vega-only examples without a Lens type.
     */
    chartType?: string | string[];
    /** Expected renderer when the example intentionally forces Lens or Vega. */
    renderer?: 'lens' | 'vega';
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
}

export type VisualizationAgentEvaluator = Evaluator<
  VisualizationDatasetExample,
  VisualizationAgentTaskOutput
>;

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
  const visualizationExtractor = (output: VisualizationAgentTaskOutput) =>
    output.visualizations ?? extractVisualizations(output);

  const esqlExecutionEvaluator = createEsqlExecutionEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    esClient,
    queryExtractor: extractVisualizationEsql,
    includeHitDetection: true,
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

  const chartTypeVsIntentEvaluator = createChartTypeVsIntentEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    visualizationExtractor,
    expectedChartTypeExtractor: (expected) => expected?.chartType,
  });

  const rendererVsIntentEvaluator = createRendererVsIntentEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    visualizationExtractor,
    expectedRendererExtractor: (expected) => expected?.renderer,
  });

  const visualizationConfigValidityEvaluator = createVisualizationConfigValidityEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    visualizationExtractor,
  });

  const chartCompatibleResultEvaluator = createChartCompatibleResultEvaluator<
    VisualizationDatasetExample,
    VisualizationAgentTaskOutput
  >({
    esClient,
    visualizationExtractor,
    expectedChartTypeExtractor: (expected) => expected?.chartType,
  });

  const trajectoryEvaluator = createTrajectoryEvaluator({
    extractToolCalls: (output) => getToolIds(output as VisualizationAgentTaskOutput),
    goldenPathExtractor: (expected) =>
      (expected as VisualizationDatasetExample['output'])?.goldenToolPath ?? [],
    orderWeight: 0.4,
    coverageWeight: 0.6,
  });

  return async function evaluateDataset({ dataset: { name, description, examples } }) {
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

      const visualizations = extractVisualizations(response);

      return {
        errors: [],
        messages: [{ message: response.message }],
        steps: response.steps,
        visualizations,
        esql: visualizations.map((visualization) => visualization.esql).join('\n'),
        agentTraceId: response.traceId,
      };
    };

    await executorClient.runExperiment({ datasets: [dataset], task }, [
      esqlExecutionEvaluator,
      esqlEquivalenceEvaluator,
      chartTypeVsIntentEvaluator,
      rendererVsIntentEvaluator,
      visualizationConfigValidityEvaluator,
      chartCompatibleResultEvaluator,
      trajectoryEvaluator,
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}
