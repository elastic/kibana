/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import {
  createQuantitativeCorrectnessEvaluators,
  type DefaultEvaluators,
  type KibanaPhoenixClient,
  type EvaluationDataset,
  createQuantitativeGroundednessEvaluator,
  selectEvaluators,
  withEvaluatorSpan,
  createSpanLatencyEvaluator,
  createRagEvaluators,
  type GroundTruth,
  type RetrievedDoc,
} from '@kbn/evals';
import type { ExperimentTask } from '@kbn/evals/src/types';
import type { TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  extractAllStrings,
  extractMaxSemver,
  extractReleaseDateNearVersion,
  getBooleanMeta,
  getFinalAssistantMessage,
  getStringMeta,
  getToolCallSteps,
} from '@kbn/evals';
import type { AgentBuilderEvaluationChatClient } from './chat_client';

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

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: {
    name: string;
    description: string;
    examples: DatasetExample[];
  };
}) => Promise<void>;

export type EvaluateExternalDataset = (datasetName: string) => Promise<void>;

function configureExperiment({
  evaluators,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
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
      correctnessAnalysis: correctnessResult?.metadata,
      groundednessAnalysis: groundednessResult?.metadata,
    };
  };

  const ragEvaluators = createRagEvaluators({
    k: 10,
    relevanceThreshold: 1,
    extractRetrievedDocs: (output: TaskOutput) => {
      const steps =
        (
          output as {
            steps?: Array<{
              type: string;
              tool_id?: string;
              results?: Array<{ data?: { reference?: { id?: string; index?: string } } }>;
            }>;
          }
        )?.steps ?? [];
      return steps
        .filter((step) => step.type === 'tool_call' && step.tool_id === 'platform.core.search')
        .flatMap((step) => step.results ?? [])
        .map((result) => ({
          index: result.data?.reference?.index,
          id: result.data?.reference?.id,
        }))
        .filter((doc): doc is RetrievedDoc => Boolean(doc.id && doc.index));
    },
    extractGroundTruth: (referenceOutput: DatasetExample['output']) =>
      referenceOutput?.groundTruth ?? {},
  });

  const selectedEvaluators = selectEvaluators([
    {
      name: 'ToolUsageOnly',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
        if (!expectedOnlyToolId) return { score: 1 };

        const toolCalls = getToolCallSteps(output as TaskOutput);
        if (toolCalls.length === 0) {
          return { score: 0, metadata: { reason: 'No tool calls found', expectedOnlyToolId } };
        }

        const usedToolIds = toolCalls.map((t) => t.tool_id).filter(Boolean);
        const hasExpected = usedToolIds.includes(expectedOnlyToolId);
        const allExpected = usedToolIds.every((id) => id === expectedOnlyToolId);

        return {
          score: hasExpected && allExpected ? 1 : 0,
          metadata: { expectedOnlyToolId, usedToolIds },
        };
      },
    },
    {
      name: 'DocVersionReleaseDate',
      kind: 'CODE' as const,
      evaluate: async ({ output, metadata }) => {
        if (!getBooleanMeta(metadata, 'requireVersionAndReleaseDate')) return { score: 1 };

        const expectedOnlyToolId = getStringMeta(metadata, 'expectedOnlyToolId');
        const toolCalls = getToolCallSteps(output as TaskOutput);
        const matching = expectedOnlyToolId
          ? toolCalls.filter((t) => t.tool_id === expectedOnlyToolId)
          : toolCalls;

        const strings: string[] = [];
        for (const call of matching) {
          extractAllStrings(call.results, strings);
        }
        const toolText = strings.join('\n');

        const maxVersion = extractMaxSemver(toolText);
        const releaseDate = maxVersion
          ? extractReleaseDateNearVersion(toolText, maxVersion)
          : undefined;
        const answer = getFinalAssistantMessage(output as TaskOutput);

        const hasVersion = Boolean(maxVersion) && answer.includes(maxVersion!);
        const hasDate = Boolean(releaseDate) && answer.includes(releaseDate!);

        return {
          score: hasVersion && hasDate ? 1 : 0,
          metadata: {
            extracted: { maxVersion, releaseDate },
            answerPreview: answer.slice(0, 500),
          },
        };
      },
    },
    ...createQuantitativeCorrectnessEvaluators(),
    createQuantitativeGroundednessEvaluator(),
    ...ragEvaluators,
    ...Object.values({
      ...evaluators.traceBasedEvaluators,
      latency: createSpanLatencyEvaluator({
        traceEsClient,
        log,
        spanName: 'Converse',
      }),
    }),
  ]);

  return { task, evaluators: selectedEvaluators };
}

export function createEvaluateDataset({
  evaluators,
  phoenixClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      traceEsClient,
      log,
    });

    await phoenixClient.runExperiment(
      {
        dataset,
        task,
      },
      selectedEvaluators
    );
  };
}

export function createEvaluateExternalDataset({
  evaluators,
  phoenixClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
  chatClient: AgentBuilderEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateExternalDataset {
  return async function evaluateExternalDataset(datasetName: string) {
    const { task, evaluators: selectedEvaluators } = configureExperiment({
      evaluators,
      chatClient,
      traceEsClient,
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
