/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import type { ConversationResult, EvaluationDataset, MultiTurnExample } from '@kbn/evals';
import {
  acrossTurns,
  createConversationCoherenceEvaluator,
  createConversationTask,
  evaluate,
  forConversation,
  forTurn,
  tags,
} from '@kbn/evals';

const dataset: EvaluationDataset<MultiTurnExample> = {
  name: 'smoke tests: multi-turn',
  description:
    'Verifies multi-turn conversations: context kept across turns, one trace per turn, and turn and conversation scores',
  examples: [
    {
      input: {
        turns: [
          {
            id: 'remember',
            message: 'Remember this code word for later: PELICAN. Reply only with "OK".',
          },
          {
            id: 'recall',
            message: 'What code word did I ask you to remember? Answer with just the word.',
          },
        ],
      },
      output: {
        expected: 'The assistant recalls the code word from the first turn.',
        turns: [{ id: 'recall', expected: 'PELICAN' }],
      },
    },
  ],
};

evaluate.describe('kbn-evals multi-turn smoke tests', { tag: tags.stateful.classic }, () => {
  evaluate(
    'smoke tests: multi-turn conversation',
    async ({
      executorClient,
      agentBuilderClient,
      evaluators,
      inferenceClient,
      evaluationConnector,
      log,
    }) => {
      const { outputTokens } = evaluators.traceBasedEvaluators;
      const recall = forTurn(
        evaluators.criteria(['The response contains the word PELICAN']),
        'recall'
      );
      const tokens = acrossTurns(outputTokens, { aggregate: 'sum' });
      const coherence = forConversation(
        createConversationCoherenceEvaluator({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          log,
        })
      );

      const [{ runs, evaluationRuns }] = await executorClient.runExperiment(
        {
          datasets: [dataset],
          task: createConversationTask({
            client: agentBuilderClient,
            agentId: 'elastic-ai-agent',
            maxTurns: 4,
          }),
        },
        [recall, tokens, coherence]
      );

      // Each turn ran on the same conversation, in its own trace.
      for (const { output } of Object.values(runs)) {
        const { conversationId, turns } = output as ConversationResult;
        expect(conversationId).toBeDefined();
        expect(turns.map(({ id }) => id)).toEqual(['remember', 'recall']);
        const traceIds = turns.map(({ traceId }) => traceId);
        expect(traceIds.every(Boolean)).toBe(true);
        expect(new Set(traceIds).size).toBe(turns.length);
      }

      const scoresOf = (name: string) =>
        evaluationRuns.filter((run) => run.name === name).map((run) => run.result?.score);

      expect(scoresOf(recall.name).some((score) => typeof score === 'number' && score > 0)).toBe(
        true
      );
      expect(scoresOf(tokens.name).every((score) => typeof score === 'number' && score > 0)).toBe(
        true
      );
      expect(scoresOf(coherence.name).length).toBeGreaterThan(0);
    }
  );
});
