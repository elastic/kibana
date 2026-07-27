/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { MessageRole } from '@kbn/inference-common';
import type { Evaluator } from '@kbn/evals';
import { evaluate, tags } from '@kbn/evals';
import { replaySnapshot, createGcsRepository } from '@kbn/es-snapshot-loader';
import type { LoadResult } from '@kbn/es-snapshot-loader';

interface TaskOutput {
  response: string | undefined;
}

evaluate.describe('kbn-evals framework smoke tests', { tag: tags.stateful.classic }, () => {
  evaluate(
    'smoke tests: score ingestion and code evaluator',
    async ({ executorClient, inferenceClient }) => {
      const evaluators: Evaluator[] = [
        {
          name: 'ContainsKibana',
          kind: 'CODE' as const,
          evaluate: async ({ output }) => ({
            score: String((output as TaskOutput)?.response ?? '')
              .toLowerCase()
              .includes('kibana')
              ? 1
              : 0,
          }),
        },
      ];

      const result = await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'smoke tests: score ingestion and code evaluator',
              description: 'Verifies score ingestion and CODE evaluator execution for @kbn/evals',
              examples: [{ input: { prompt: 'Reply with only the single word: KIBANA' } }],
            },
          ],
          task: async (example) => {
            const { prompt } = example.input! as { prompt: string };
            const response = await inferenceClient.chatComplete({
              stream: false,
              messages: [{ role: MessageRole.User, content: prompt }],
            });
            return { response: response.content };
          },
        },
        evaluators
      );
      expect(result[0].evaluationRuns.length).toBeGreaterThan(0);
      const scores = result[0].evaluationRuns.map((r) => r.result?.score);
      expect(scores.every((s) => s !== undefined)).toBe(true);
    }
  );

  evaluate('smoke tests: llm-judge', async ({ executorClient, inferenceClient, evaluators }) => {
    const result = await executorClient.runExperiment(
      {
        datasets: [
          {
            name: 'smoke tests: llm-judge',
            description: 'Verifies LLM-as-judge criteria evaluator execution for @kbn/evals',
            examples: [
              {
                input: { prompt: 'What is 2 + 2? Answer with just the number.' } as {
                  prompt: string;
                },
              },
            ],
          },
        ],
        task: async (example) => {
          const { prompt } = example.input! as { prompt: string };
          const response = await inferenceClient.chatComplete({
            stream: false,
            messages: [{ role: MessageRole.User, content: prompt }],
          });
          return { response: response.content };
        },
      },
      [
        {
          ...evaluators.criteria(['The response contains the number 4 or the word "four"']),
          name: 'Criteria',
        },
      ]
    );
    expect(result[0].evaluationRuns.length).toBeGreaterThan(0);
    const scores = result[0].evaluationRuns.map((r) => r.result?.score);
    expect(scores.some((s) => typeof s === 'number' && s > 0)).toBe(true);
  });

  evaluate(
    'smoke tests: trace-retrieval',
    async ({ executorClient, inferenceClient, evaluators }) => {
      const { inputTokens, outputTokens } = evaluators.traceBasedEvaluators;

      const result = await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'smoke tests: trace-retrieval',
              description: 'Verifies that task traces are stored and retrievable',
              examples: [{ input: { prompt: 'Say the word hello.' } as { prompt: string } }],
            },
          ],
          task: async (example) => {
            const { prompt } = example.input! as { prompt: string };
            const response = await inferenceClient.chatComplete({
              stream: false,
              messages: [{ role: MessageRole.User, content: prompt }],
            });
            return { response: response.content };
          },
        },
        [inputTokens, outputTokens]
      );

      const scores = result[0].evaluationRuns.map((r) => r.result?.score);
      expect(scores.every((s) => s !== null && s !== undefined)).toBe(true);
      expect(scores.some((s) => typeof s === 'number' && s > 0)).toBe(true);
    }
  );

  evaluate(
    'smoke tests: trace-based evaluators',
    async ({ executorClient, agentBuilderClient, evaluatorClient }) => {
      const connectorId = process.env.SMOKE_TEST_EVALUATION_CONNECTOR_ID;
      evaluate.skip(
        !connectorId,
        'Set SMOKE_TEST_EVALUATION_CONNECTOR_ID to run the trace-based evaluator smoke test'
      );

      const result = await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'smoke tests: trace-based evaluators',
              description:
                'Verifies trace-based groundedness and correctness evaluators via the evaluator API',
              examples: [
                {
                  input: { prompt: 'What is the current status of the payment service?' },
                  output: {
                    expected:
                      'The status of the payment service is unknown based on the available information.',
                  },
                },
              ],
            },
          ],
          task: async (example) => {
            const { prompt } = example.input! as { prompt: string };
            const response = await agentBuilderClient.converse({
              agentId: 'elastic-ai-agent',
              input: prompt,
            });
            if (!response.traceId) {
              throw new Error('Agent Builder response is missing traceId');
            }
            return { traceId: response.traceId };
          },
        },
        evaluatorClient.toEvaluators([
          { name: 'groundedness', kind: 'LLM', connectorId: connectorId! },
          {
            name: 'correctness',
            kind: 'LLM',
            connectorId: connectorId!,
            subScores: [
              { key: 'factuality', evaluatorName: 'Factuality' },
              { key: 'relevance', evaluatorName: 'Relevance' },
              { key: 'sequence_accuracy', evaluatorName: 'Sequence Accuracy' },
            ],
          },
        ])
      );

      expect(result[0].evaluationRuns.length).toBeGreaterThan(0);

      const groundednessRun = result[0].evaluationRuns.find((r) => r.name === 'groundedness');
      expect(groundednessRun?.result?.label).toBeDefined();

      const factualityRun = result[0].evaluationRuns.find((r) => r.name === 'Factuality');
      expect(factualityRun?.result?.label).toBeDefined();
    }
  );

  evaluate.describe('smoke tests: es-snapshot-loader', () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ esClient, log }) => {
      replayResult = await replaySnapshot({
        esClient,
        log,
        repository: createGcsRepository({
          bucket: 'obs-ai-datasets',
          basePath: 'otel-demo/payment-service-failures',
        }),
        snapshotName: 'payment-service-failures',
        patterns: ['logs-*', 'metrics-*', 'traces-*'],
      });
    });

    evaluate('snapshot restoration loads data into data streams', async ({ executorClient }) => {
      const result = await executorClient.runExperiment(
        {
          datasets: [
            {
              name: 'smoke tests: es-snapshot-loader',
              description:
                'Verifies that @kbn/es-snapshot-loader can replay a GCS snapshot into data streams',
              examples: [{ input: { snapshotName: 'payment-service-failures' } }],
            },
          ],
          task: async () => ({
            success: replayResult.success,
            reindexedIndices: replayResult.reindexedIndices ?? [],
          }),
        },
        [
          {
            name: 'SnapshotRestored',
            kind: 'CODE' as const,
            evaluate: async ({ output }) => {
              const { success, reindexedIndices } = output as {
                success: boolean;
                reindexedIndices: string[];
              };
              return { score: success && reindexedIndices.length > 0 ? 1 : 0 };
            },
          },
        ]
      );

      expect(result[0].evaluationRuns.length).toBeGreaterThan(0);
      const scores = result[0].evaluationRuns.map((r) => r.result?.score);
      expect(scores.every((s) => s === 1)).toBe(true);
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      const indices = [...new Set(replayResult?.reindexedIndices ?? [])];
      await Promise.all(
        indices.map(async (index) => {
          try {
            await esClient.deleteByQuery({
              index,
              query: { match_all: {} },
              refresh: true,
            });
          } catch (error) {
            log.warning(`Cleanup failed for [${index}]`);
          }
        })
      );
    });
  });
});
