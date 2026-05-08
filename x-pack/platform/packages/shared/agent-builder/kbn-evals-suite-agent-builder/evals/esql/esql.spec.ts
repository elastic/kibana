/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset, EvalsExecutorClient, Example, ExperimentTask } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator } from '@kbn/evals';
import type { TaskOutput } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { tags } from '@kbn/scout';
import type { AgentBuilderEvaluationChatClient } from '../../src/chat_client';
import { evaluate as base } from '../../src/evaluate';

export type EvaluateDataset = ({
  dataset: { name, description, examples },
}: {
  dataset: { name: string; description: string; examples: DatasetExample[] };
}) => Promise<void>;

type DatasetExample = Example<
  { question: string },
  { query: string },
  {
    query_intent?: string;
    esql?: string;
  }
>;

interface EsqlTaskOutput {
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps: ToolCallStep[];
  esql: string;
}

interface ToolCallStep {
  type?: string;
  tool_id?: string;
  params?: { query?: unknown };
}

const extractFirstExecuteEsqlQuery = (output: TaskOutput): string => {
  const steps = (output as { steps?: ToolCallStep[] } | undefined)?.steps ?? ([] as ToolCallStep[]);
  for (const step of steps) {
    if (step.type !== 'tool_call') continue;
    if (step.tool_id !== platformCoreTools.executeEsql) continue;
    const query = step.params?.query;
    if (typeof query === 'string' && query.length > 0) {
      return query;
    }
  }
  return '';
};

function createEvaluateEsqlDataset({
  executorClient,
  chatClient,
  inferenceClient,
  log,
}: {
  executorClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    // The new ES|QL flow has the agent generate ES|QL itself by following the
    // `elasticsearch-esql` skill, then run the query via `platform.core.execute_esql`.
    // The eval drives the converse API end-to-end and extracts the ES|QL the agent
    // submitted to `platform.core.execute_esql` for equivalence comparison against
    // the ground truth query.
    const executeAgentTask: ExperimentTask<DatasetExample, EsqlTaskOutput> = async ({ input }) => {
      const response = await chatClient.converse({
        messages: [{ message: input!.question }],
      });

      const steps = (response.steps ?? []) as ToolCallStep[];
      const messages = response.messages.map(({ message }) => ({ message }));
      const taskOutput: EsqlTaskOutput = {
        errors: response.errors,
        messages,
        steps,
        esql: extractFirstExecuteEsqlQuery({ steps } as TaskOutput),
      };

      return taskOutput;
    };

    const esqlEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
      inferenceClient,
      log,
      predictionExtractor: (output) => (output as EsqlTaskOutput).esql ?? '',
      groundTruthExtractor: (expected) => (expected as { query?: string } | undefined)?.query ?? '',
    });

    await executorClient.runExperiment(
      {
        dataset,
        task: executeAgentTask,
      },
      [esqlEquivalenceEvaluator]
    );
  };
}

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    async ({ chatClient, executorClient, inferenceClient, log }, use) => {
      await use(
        createEvaluateEsqlDataset({
          chatClient,
          executorClient,
          inferenceClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('ES|QL tool evaluation', { tag: tags.serverless.search }, () => {
  evaluate('analytical queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'esql: analytical queries',
        description: 'Dataset containing Analytical queries',
        examples: [
          {
            input: { question: 'When did tina.jackson@gray-smith.com signup' },
            output: {
              query: `FROM users
| WHERE email == "tina.jackson@gray-smith.com"
| KEEP created_at`,
            },
            metadata: {
              query_intent: 'Factual',
            },
          },
          {
            input: { question: 'What is the id of the project that was deleted most recently' },
            output: {
              query: `FROM projects
| WHERE deleted_at IS NOT NULL
| SORT deleted_at DESC
| LIMIT 1
| KEEP id, deleted_at`,
            },
            metadata: {
              query_intent: 'Factual - Temporal',
            },
          },
          {
            input: {
              question:
                'What is the id of the project with highest daily average error count between Jun 2024 to Dec 2024',
            },
            output: {
              query: `FROM error_rate_daily
| WHERE date >= "2024-06-01" AND date <= "2024-12-31"
| STATS avg_daily_errors = AVG(error_count) BY project_id
| SORT avg_daily_errors DESC
| LIMIT 1
| KEEP project_id`,
            },
            metadata: {
              query_intent: 'Factual - Temporal',
            },
          },
        ],
      },
    });
  });
});
