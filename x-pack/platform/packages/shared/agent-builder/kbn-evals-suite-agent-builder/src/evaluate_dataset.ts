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

  // Auxiliary tools used for skill discovery - ignored by ToolUsageOnly evaluator
  const AUXILIARY_DISCOVERY_TOOLS = new Set([
    'grep',
    'read_file',
    'read_skill_tools',
    'list_skills',
  ]);

  // Helper to get tool call steps with params from raw output
  const getToolCallStepsWithParams = (
    taskOutput: TaskOutput
  ): Array<{ tool_id?: string; params?: Record<string, unknown>; results?: unknown[] }> => {
    const rawOutput = taskOutput as {
      steps?: Array<{
        type?: string;
        tool_id?: string;
        tool_params?: Record<string, unknown>;
        params?: Record<string, unknown>;
        results?: unknown[];
      }>;
    };
    const steps = rawOutput?.steps ?? [];

    return steps
      .filter((s) => s?.type === 'tool_call')
      .map((s) => ({
        tool_id: s.tool_id,
        params: s.tool_params ?? s.params,
        results: s.results,
      }));
  };

  const selectedEvaluators = selectEvaluators([
    {
      name: 'ToolUsageOnly',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
        if (!expectedOnlyToolId) return { score: 1 };

        const toolCalls = getToolCallStepsWithParams(output as TaskOutput);
        if (toolCalls.length === 0) {
          return { score: 0, metadata: { reason: 'No tool calls found', expectedOnlyToolId } };
        }

        // Filter out auxiliary discovery tools
        const meaningfulToolCalls = toolCalls.filter(
          (t) => !AUXILIARY_DISCOVERY_TOOLS.has(t.tool_id || '')
        );

        if (meaningfulToolCalls.length === 0) {
          return {
            score: 0,
            metadata: { reason: 'Only auxiliary discovery tools found', expectedOnlyToolId },
          };
        }

        // Check if invoke_skill was called with the expected skill/operation
        const invokeSkillMatchesExpected = (toolCall: {
          tool_id?: string;
          params?: Record<string, unknown>;
        }) => {
          if (toolCall.tool_id !== 'invoke_skill') return false;
          const params = toolCall.params as {
            name?: string;
            operation?: string;
            params?: { operation?: string };
          } | undefined;
          if (!params?.name) return false;

          // Extract the operation (could be at top level or nested in params)
          const operation = params.operation || params.params?.operation;

          // Extract the expected tool name and operation from expectedOnlyToolId
          // e.g., platform.core.execute_esql -> tool: execute_esql
          const expectedToolName = expectedOnlyToolId.split('.').pop() || '';

          // Match skill namespace patterns (e.g., platform.search matches platform.core.search)
          const expectedNamespace = expectedOnlyToolId.replace('.core.', '.');

          // Direct skill name match
          if (params.name === expectedNamespace || params.name === expectedOnlyToolId) {
            return true;
          }

          // For platform.search skill that handles multiple operations:
          // - If expecting platform.core.search and skill is platform.search with operation 'search', match
          // - If expecting platform.core.execute_esql and skill is platform.search with operation 'execute_esql', match
          if (params.name === 'platform.search') {
            if (expectedToolName === 'search' && (!operation || operation === 'search')) {
              return true;
            }
            if (expectedToolName === 'execute_esql' && operation === 'execute_esql') {
              return true;
            }
          }

          return false;
        };

        const usedToolIds = meaningfulToolCalls.map((t) => t.tool_id).filter(Boolean);
        const hasExpectedDirect = usedToolIds.includes(expectedOnlyToolId);
        const hasExpectedViaInvokeSkill = meaningfulToolCalls.some(invokeSkillMatchesExpected);
        const hasExpected = hasExpectedDirect || hasExpectedViaInvokeSkill;

        // For ES|QL, agent may call generate_esql before execute_esql - that's acceptable
        // Check if the expected tool/operation was used (doesn't need to be the ONLY one)

        // Debug: Log invoke_skill params for troubleshooting
        const invokeSkillCalls = meaningfulToolCalls
          .filter((t) => t.tool_id === 'invoke_skill')
          .map((t) => ({
            name: (t.params as { name?: string })?.name,
            operation: (t.params as { operation?: string })?.operation,
            nestedOp: (t.params as { params?: { operation?: string } })?.params?.operation,
          }));

        return {
          score: hasExpected ? 1 : 0,
          metadata: {
            expectedOnlyToolId,
            usedToolIds,
            hasExpectedDirect,
            hasExpectedViaInvokeSkill,
            invokeSkillCalls,
          },
        };
      },
    },
    // NOTE: DocVersionReleaseDate evaluator removed from defaults - only used by product_documentation tests
    // Tests that need it should add it via custom evaluator config with metadata.requireVersionAndReleaseDate: true
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
