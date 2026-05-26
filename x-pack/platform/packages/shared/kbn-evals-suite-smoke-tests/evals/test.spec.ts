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
          dataset: {
            name: 'smoke tests: score ingestion and code evaluator',
            description: 'Verifies score ingestion and CODE evaluator execution for @kbn/evals',
            examples: [{ input: { prompt: 'Reply with only the single word: KIBANA' } }],
          },
          task: async (example) => {
            const response = await inferenceClient.chatComplete({
              stream: false,
              messages: [{ role: MessageRole.User, content: example.input.prompt }],
            });
            return { response: response.content };
          },
        },
        evaluators
      );
      expect(result.evaluationRuns.length).toBeGreaterThan(0);
      const scores = result.evaluationRuns.map((r) => r.result?.score);
      expect(scores.every((s) => s !== undefined)).toBe(true);
    }
  );

  evaluate('smoke tests: llm-judge', async ({ executorClient, inferenceClient, evaluators }) => {
    const result = await executorClient.runExperiment(
      {
        dataset: {
          name: 'smoke tests: llm-judge',
          description: 'Verifies LLM-as-judge criteria evaluator execution for @kbn/evals',
          examples: [{ input: { prompt: 'What is 2 + 2? Answer with just the number.' } }],
        },
        task: async (example) => {
          const response = await inferenceClient.chatComplete({
            stream: false,
            messages: [{ role: MessageRole.User, content: example.input.prompt }],
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
    expect(result.evaluationRuns.length).toBeGreaterThan(0);
    const scores = result.evaluationRuns.map((r) => r.result?.score);
    expect(scores.some((s) => typeof s === 'number' && s > 0)).toBe(true);
  });

  evaluate(
    'smoke tests: trace-retrieval',
    async ({ executorClient, inferenceClient, evaluators }) => {
      const { inputTokens, outputTokens } = evaluators.traceBasedEvaluators;

      const result = await executorClient.runExperiment(
        {
          dataset: {
            name: 'smoke tests: trace-retrieval',
            description: 'Verifies that task traces are stored and retrievable',
            examples: [{ input: { prompt: 'Say the word hello.' } }],
          },
          task: async (example) => {
            const response = await inferenceClient.chatComplete({
              stream: false,
              messages: [{ role: MessageRole.User, content: example.input.prompt }],
            });
            return { response: response.content };
          },
        },
        [inputTokens, outputTokens]
      );

      const scores = result.evaluationRuns.map((r) => r.result?.score);
      expect(scores.every((s) => s !== null && s !== undefined)).toBe(true);
      expect(scores.some((s) => typeof s === 'number' && s > 0)).toBe(true);
    }
  );
});
