/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import type {
  ConversationResult,
  EvaluationDataset,
  Evaluator,
  MultiTurnExample,
  NextMessageFn,
} from '@kbn/evals';
import {
  acrossTurns,
  createConversationCoherenceEvaluator,
  createConversationTask,
  evaluate,
  forConversation,
  forFinalTurn,
  forTurn,
  tags,
} from '@kbn/evals';

/**
 * An on-call handoff. The user gives the incident facts, corrects two of them, and asks for a
 * handoff note. A fourth turn is chosen from the agent's note: the user shares the resolution
 * time and asks for the note to be updated. The agent has to keep the facts across turns and
 * use the corrected owner and severity, not the original ones.
 */
const dataset: EvaluationDataset<MultiTurnExample> = {
  name: 'smoke tests: multi-turn incident handoff',
  description:
    'An Agent Builder agent keeps incident facts across turns, applies a correction, and updates its own note',
  examples: [
    {
      input: {
        turns: [
          {
            id: 'facts',
            message:
              "I'm taking notes on an incident in the checkout service. It started at 14:05 UTC, the Payments team owns it, and it is SEV-2. Confirm you have it in one short sentence. Don't look anything up.",
          },
          {
            id: 'correction',
            message:
              'Correction: ownership moved to the Commerce team this morning, and the incident was raised to SEV-1. Confirm in one short sentence.',
          },
          {
            id: 'handoff',
            message:
              'Write a three-line handoff note for the next on-call engineer: when it started, which team owns it now, and the current severity.',
          },
        ],
      },
      output: {
        expected:
          'The assistant keeps the start time, applies the ownership and severity correction, and adds the resolution time when asked.',
        turns: [
          { id: 'handoff', must_include: ['14:05', 'Commerce', 'SEV-1'] },
          { id: 'resolution', must_include: ['14:05', '15:30', 'Commerce', 'SEV-1'] },
        ],
      },
    },
  ],
};

/** After the handoff note, the user shares the resolution time and asks to update that note. */
const askForResolutionUpdate: NextMessageFn = ({ turns }) => {
  const last = turns.at(-1);
  if (last?.id !== 'handoff') {
    return undefined;
  }
  return {
    id: 'resolution',
    message: `The incident was resolved at 15:30 UTC. Here is the note you wrote:\n\n${last.response}\n\nUpdate it with the resolution time and keep the rest.`,
  };
};

/** Share of the turn's `must_include` facts that appear in its reply. */
const factsInReply: Evaluator = {
  name: 'Facts in reply',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const reply = ((output as { response?: string }).response ?? '').toLowerCase();
    const facts = (expected as { must_include?: string[] } | null)?.must_include ?? [];
    if (facts.length === 0) {
      return { score: null, label: 'unavailable', explanation: 'No facts to check for this turn' };
    }
    const missing = facts.filter((fact) => !reply.includes(fact.toLowerCase()));
    return {
      score: (facts.length - missing.length) / facts.length,
      explanation: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All facts present',
    };
  },
};

evaluate.describe('kbn-evals multi-turn smoke tests', { tag: tags.stateful.classic }, () => {
  evaluate(
    'smoke tests: multi-turn incident handoff',
    async ({
      executorClient,
      agentBuilderClient,
      evaluators,
      inferenceClient,
      evaluationConnector,
      log,
    }) => {
      // CODE check against each graded turn's own ground truth; the worst turn is the score.
      const facts = acrossTurns(factsInReply, {
        turnIds: ['handoff', 'resolution'],
        aggregate: 'min',
      });
      // LLM judge on the turn where the correction has to show.
      const handoff = forTurn(
        evaluators.criteria([
          'The note says the Commerce team owns the incident now, not the Payments team',
          'The note gives the current severity as SEV-1, not SEV-2',
          'The note gives the start time as 14:05 UTC',
        ]),
        'handoff'
      );
      // LLM judge on the turn the callback chose.
      const resolution = forFinalTurn(
        evaluators.criteria([
          'The updated note adds the resolution time 15:30 UTC',
          'The updated note keeps the start time, the Commerce team and SEV-1',
        ])
      );
      // Trace metrics, summed over the per-turn traces.
      const tokens = acrossTurns(evaluators.traceBasedEvaluators.outputTokens, {
        aggregate: 'sum',
      });
      // Transcript judge for the whole conversation.
      const coherence = forConversation(
        createConversationCoherenceEvaluator({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          log,
        })
      );
      const graded = [facts, handoff, resolution, tokens, coherence];

      const [{ runs, evaluationRuns }] = await executorClient.runExperiment(
        {
          datasets: [dataset],
          task: createConversationTask({
            client: agentBuilderClient,
            agentId: 'elastic-ai-agent',
            nextMessage: askForResolutionUpdate,
            maxTurns: 6,
          }),
        },
        graded
      );

      for (const { output } of Object.values(runs)) {
        const { conversationId, turns, stopReason } = output as ConversationResult;

        // Three scripted turns, then the one the callback chose, all on one conversation.
        expect(conversationId).toBeDefined();
        expect(turns.map(({ id, source }) => ({ id, source }))).toEqual([
          { id: 'facts', source: 'scripted' },
          { id: 'correction', source: 'scripted' },
          { id: 'handoff', source: 'scripted' },
          { id: 'resolution', source: 'callback' },
        ]);
        expect(stopReason).toBe('stopped');

        // The callback built its turn from the agent's own reply.
        const [, , handoffTurn, resolutionTurn] = turns;
        expect(resolutionTurn.message).toContain(handoffTurn.response);

        // Every turn has its own trace.
        const traceIds = turns.map(({ traceId }) => traceId);
        expect(traceIds.every(Boolean)).toBe(true);
        expect(new Set(traceIds).size).toBe(turns.length);
      }

      // Each wrapped evaluator reported a real result under its own name.
      for (const { name } of graded) {
        const results = evaluationRuns.filter((run) => run.name === name).map((run) => run.result);
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((result) => result?.label !== 'unavailable')).toBe(true);
      }

      const tokenScores = evaluationRuns
        .filter((run) => run.name === tokens.name)
        .map((run) => run.result?.score);
      expect(tokenScores.every((score) => typeof score === 'number' && score > 0)).toBe(true);
    }
  );
});
