/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type Example,
  type EvaluationDataset,
  type Evaluator,
  type ExperimentTask,
  getStringMeta,
} from '@kbn/evals';
import type { DashboardAgentEvaluationChatClient } from './chat_client';

export interface DashboardDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
    expectedDashboardAttachment?: {
      exists?: boolean;
      title?: {
        nonEmpty?: boolean;
      };
      panelCount?: {
        min?: number;
        max?: number;
      };
      sectionCount?: number;
      sections?: Array<{
        titleIncludes?: string[];
        titleIncludesAny?: string[];
        minPanels?: number;
        maxPanels?: number;
      }>;
      grid?: {
        maxColumns?: number;
        noOverflow?: boolean;
        rows?: Array<{
          panelCount?: number;
          y?: number;
          widths?: number[];
          widthRange?: {
            min?: number;
            max?: number;
          };
          height?: number;
          heightRange?: {
            min?: number;
            max?: number;
          };
          fillsWidth?: boolean;
          yAfterPreviousRow?: boolean;
        }>;
      };
    };
    goldenToolPath?: string[];
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
  agentTraceId?: string;
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

const useAgentTraceId = (evaluator: Evaluator): DashboardAgentEvaluator => ({
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
  evaluators,
  executorClient,
  chatClient,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: DashboardAgentEvaluationChatClient;
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

    const task: ExperimentTask<DashboardDatasetExample, DashboardAgentTaskOutput> = async ({
      input,
      metadata,
    }) => {
      const agentId = getStringMeta(metadata, 'agentId');
      const response = await chatClient.converse({
        messages: [{ message: input.question }],
        options: agentId ? { agentId } : undefined,
      });

      return {
        errors: response.errors,
        messages: response.messages,
        steps: response.steps,
        agentTraceId: response.traceId,
      };
    };

    await executorClient.runExperiment({ datasets: [dataset], task }, [
      ...(customEvaluators ?? []),
      ...Object.values(evaluators.traceBasedEvaluators).map(useAgentTraceId),
    ]);
  };
}
