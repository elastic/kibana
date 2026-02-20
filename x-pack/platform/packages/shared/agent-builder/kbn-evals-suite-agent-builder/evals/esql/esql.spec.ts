/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset, EvalsExecutorClient, Example, ExperimentTask } from '@kbn/evals';
import { createEsqlEquivalenceEvaluator } from '@kbn/evals';
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

interface ToolResult {
  data?: { esql?: string };
  type?: string;
}

interface ToolTaskOutput {
  results: unknown[];
  errors: unknown[];
  esql: string;
}

function createEvaluateEsqlDataset({
  phoenixClient,
  chatClient,
  inferenceClient,
  log,
}: {
  phoenixClient: EvalsExecutorClient;
  chatClient: AgentBuilderEvaluationChatClient;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): EvaluateDataset {
  return async function evaluateDataset({ dataset: { name, description, examples } }) {
    const dataset = { name, description, examples } satisfies EvaluationDataset;

    const executeToolTask: ExperimentTask<DatasetExample, ToolTaskOutput> = async ({ input }) => {
      const response = await chatClient.executeTool({
        toolId: platformCoreTools.generateEsql,
        toolParams: { query: input.question },
      });

      const esql = (response.results as ToolResult[])
        .filter((r) => r.type === 'query')
        .map((r) => r.data?.esql)
        .filter(Boolean)
        .join('\n');

      return {
        results: response.results,
        errors: response.errors,
        esql,
      };
    };

    const esqlEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
      inferenceClient,
      log,
      predictionExtractor: (output) => (output as ToolTaskOutput).esql ?? '',
      groundTruthExtractor: (expected) => (expected as { query?: string } | undefined)?.query ?? '',
    });

    await phoenixClient.runExperiment(
      {
        dataset,
        task: executeToolTask,
      },
      [esqlEquivalenceEvaluator]
    );
  };
}

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    async ({ chatClient, phoenixClient, inferenceClient, log }, use) => {
      await use(
        createEvaluateEsqlDataset({
          chatClient,
          phoenixClient,
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
