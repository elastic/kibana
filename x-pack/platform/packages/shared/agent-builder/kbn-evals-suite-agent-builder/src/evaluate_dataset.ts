/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createQuantitativeCorrectnessEvaluators,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type Example,
  type EvaluationDataset,
  createQuantitativeGroundednessEvaluator,
  selectEvaluators,
  withEvaluatorSpan,
  type ExperimentTask,
  type TaskOutput,
  type GroundTruth,
  type RetrievedDoc,
  createToolUsageOnlyEvaluator,
} from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { getStringMeta } from '@kbn/evals';
import type { AgentBuilderEvaluationChatClient, ConverseResult } from './chat_client';

interface DatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
    groundTruth?: GroundTruth;
  };
  metadata?: {
    [key: string]: unknown;
  };
}

/** Default concurrency for running examples in parallel */
const DEFAULT_CONCURRENCY = 3;

export type EvaluateDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
  /** Number of examples to run concurrently (default: 3) */
  concurrency?: number;
}) => Promise<void>;

export type EvaluateExternalDataset = (datasetName: string) => Promise<void>;

function configureExperiment({
  evaluators,
  chatClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  chatClient: AgentBuilderEvaluationChatClient;
  log: ToolingLog;
}): {
  task: ExperimentTask<DatasetExample, TaskOutput>;
  evaluators: ReturnType<typeof selectEvaluators>;
} {
  const task: ExperimentTask<DatasetExample, TaskOutput> = async ({ input, output, metadata }) => {
    const agentId = getStringMeta(metadata, 'agentId');
    const response = await chatClient.converse({
      messages: [{ message: input.question }],
      options: agentId ? { agentId } : undefined,
    });

    // Running correctness and groundedness evaluators as part of the task since their respective quantitative evaluators need their output
    // Wrap LLM judge calls @kbn/evals spans and assign root context to prevent them from contributing to latency, token use and other metrics of the EvaluateExample span
    const [correctnessResult, groundednessResult] = await Promise.all([
      withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
        evaluators.correctnessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        })
      ),
      withEvaluatorSpan('GroundednessAnalysis', {}, () =>
        evaluators.groundednessAnalysis().evaluate({
          input,
          expected: output,
          output: response,
          metadata,
        })
      ),
    ]);

    return {
      errors: response.errors,
      messages: response.messages,
      steps: response.steps,
      traceId: response.traceId,
      modelUsage: response.modelUsage,
      correctnessAnalysis: correctnessResult?.metadata,
      groundednessAnalysis: groundednessResult?.metadata,
    };
  };

  const selectedEvaluators = selectEvaluators([
    createToolUsageOnlyEvaluator(),
    {
      name: 'TokenUsage',
      kind: 'CODE' as const,
      evaluate: async ({ output }) => {
        const taskOutput = output as TaskOutput & {
          modelUsage?: ConverseResult['modelUsage'];
        };
        const modelUsage = taskOutput.modelUsage;

        // Extract token metrics from model_usage (direct from API response)
        const inputTokens = modelUsage?.input_tokens ?? 0;
        const outputTokens = modelUsage?.output_tokens ?? 0;
        const totalTokens = inputTokens + outputTokens;
        const llmCalls = modelUsage?.llm_calls ?? 0;

        // Calculate cost estimate (default pricing: $0.003/1K input, $0.015/1K output)
        const inputPricePer1K = 0.003;
        const outputPricePer1K = 0.015;
        const estimatedCost =
          (inputTokens / 1000) * inputPricePer1K + (outputTokens / 1000) * outputPricePer1K;

        // Return totalTokens as the score so it shows actual numbers in the report
        return {
          score: totalTokens,
          metadata: {
            source: 'direct',
            inputTokens,
            outputTokens,
            totalTokens,
            llmCalls,
            model: modelUsage?.model,
            connectorId: modelUsage?.connector_id,
            estimatedCostUsd: Math.round(estimatedCost * 10000) / 10000,
          },
        };
      },
    },
    // NOTE: Trace-based evaluators (inputTokens, outputTokens, cachedTokens) removed
    // They require APM tracing infrastructure. Use TokenUsage evaluator above instead.
    // Core evaluators: Factuality, Relevance, Sequence Accuracy
    ...createQuantitativeCorrectnessEvaluators(),
    // Groundedness evaluator
    createQuantitativeGroundednessEvaluator(),
  ]);

  return { task, evaluators: selectedEvaluators };
}

export function createEvaluateDataset({
  evaluators,
  phoenixClient,
  chatClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
    concurrency = DEFAULT_CONCURRENCY,
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
    /** Number of examples to run concurrently (default: 3) */
    concurrency?: number;
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      log,
    });

    await phoenixClient.runExperiment(
      {
        dataset,
        task,
        concurrency,
      },
      selectedEvaluators
    );
  };
}

export function createEvaluateExternalDataset({
  evaluators,
  phoenixClient,
  chatClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  log: ToolingLog;
}): EvaluateExternalDataset {
  return async function evaluateExternalDataset(datasetName: string) {
    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      log,
    });

    await phoenixClient.runExperiment(
      {
        dataset: {
          name: datasetName,
          description: 'External dataset resolved from Phoenix by name',
          examples: [], // Examples will be loaded from Phoenix, not provided in code
        },
        task,
        trustUpstreamDataset: true,
      },
      selectedEvaluators
    );
  };
}
