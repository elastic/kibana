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
  createSpanLatencyEvaluator,
  type Evaluator,
  type ExperimentTask,
} from '@kbn/evals';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import { getStringMeta } from '@kbn/evals';
import type { DashboardAgentEvaluationChatClient } from './chat_client';

const stringifyForDebug = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const logConversationDebug = ({
  log,
  input,
  response,
}: {
  log: ToolingLog;
  input: string;
  response: {
    messages: Array<{ message: string }>;
    steps?: Array<Record<string, unknown>>;
    errors: unknown[];
    traceId?: string;
  };
}) => {
  log.info(
    [
      'Agent Builder dashboards eval conversation debug:',
      `Input: ${input}`,
      `Trace ID: ${response.traceId ?? '<none>'}`,
      `Messages: ${stringifyForDebug(response.messages)}`,
      `Steps: ${stringifyForDebug(response.steps ?? [])}`,
      `Errors: ${stringifyForDebug(response.errors)}`,
    ].join('\n')
  );
};

export interface DashboardDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
  };
  metadata?: {
    [key: string]: unknown;
  };
}

export interface DashboardAgentTaskOutput {
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  traceId?: string;
  correctnessAnalysis?: Record<string, unknown>;
  groundednessAnalysis?: Record<string, unknown>;
}

export type DashboardAgentEvaluator = Evaluator<DashboardDatasetExample, DashboardAgentTaskOutput>;

export type EvaluateDataset = ({
  dataset: { name, description, examples },
  evaluators,
}: {
  dataset: {
    name: string;
    description: string;
    examples: DashboardDatasetExample[];
  };
  evaluators?: DashboardAgentEvaluator[];
}) => Promise<void>;

function configureExperiment({
  evaluators,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  chatClient: DashboardAgentEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): {
  task: ExperimentTask<DashboardDatasetExample, DashboardAgentTaskOutput>;
  evaluators: ReturnType<typeof selectEvaluators>;
} {
  const task: ExperimentTask<DashboardDatasetExample, DashboardAgentTaskOutput> = async ({
    input,
    output,
    metadata,
  }) => {
    const agentId = getStringMeta(metadata, 'agentId');
    const response = await chatClient.converse({
      messages: [{ message: input.question }],
      options: agentId ? { agentId } : undefined,
    });

    if (metadata?.debugConversation === true) {
      logConversationDebug({ log, input: input.question, response });
    }

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

  const selectedEvaluators = selectEvaluators([
    ...createQuantitativeCorrectnessEvaluators(),
    createQuantitativeGroundednessEvaluator(),
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
  executorClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: DashboardAgentEvaluationChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({
    dataset: { name, description, examples },
    evaluators: customEvaluators,
  }: {
    dataset: {
      name: string;
      description: string;
      examples: DashboardDatasetExample[];
    };
    evaluators?: DashboardAgentEvaluator[];
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    // Use custom evaluators if provided, otherwise use default LLM-based evaluators
    if (customEvaluators && customEvaluators.length > 0) {
      const task: ExperimentTask<DashboardDatasetExample, DashboardAgentTaskOutput> = async ({
        input,
        metadata,
      }) => {
        const agentId = getStringMeta(metadata, 'agentId');
        const response = await chatClient.converse({
          messages: [{ message: input.question }],
          options: agentId ? { agentId } : undefined,
        });

        if (metadata?.debugConversation === true) {
          logConversationDebug({ log, input: input.question, response });
        }

        return {
          errors: response.errors,
          messages: response.messages,
          steps: response.steps,
          traceId: response.traceId,
        };
      };

      await executorClient.runExperiment({ dataset, task }, customEvaluators);
    } else {
      const { task, evaluators: selectedEvaluators } = configureExperiment({
        evaluators,
        chatClient,
        traceEsClient,
        log,
      });

      await executorClient.runExperiment(
        {
          dataset,
          task,
        },
        selectedEvaluators
      );
    }
  };
}
