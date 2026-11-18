/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@playwright/test';
import type {
  DatasetRunResult,
  EvaluationDataset,
  Evaluator,
  MultiTurnExample,
  MultiTurnResult,
  NextMessageFn,
} from '@kbn/evals';
import {
  acrossTurns,
  agentBuilderTarget,
  createConversationCoherenceEvaluator,
  createConversationCompletedEvaluator,
  createConversationTask,
  createSimulatedUser,
  evaluate,
  forConversation,
  forFinalTurn,
  forTurn,
  inferenceTarget,
  tags,
} from '@kbn/evals';

const AGENT_ID = 'elastic-ai-agent';
// Generous, so a slow model isn't mistaken for a lost turn; a timed-out turn is read back.
const TURN_TIMEOUT_MS = 5 * 60_000;

/** The output of every run, with the scores each evaluator reported under its own name. */
const readRuns = ({ runs, evaluationRuns }: DatasetRunResult) => ({
  outputs: Object.values(runs).map(({ output }) => output as MultiTurnResult),
  resultsOf: (name: string) =>
    evaluationRuns.filter((run) => run.name === name).map((run) => run.result),
});

const expectEveryTurnTraced = ({ turns }: MultiTurnResult) => {
  const traceIds = turns.map(({ traceId }) => traceId);
  expect(traceIds.every(Boolean)).toBe(true);
  expect(new Set(traceIds).size).toBe(turns.length);
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
  /**
   * An on-call handoff with an Agent Builder agent. The user gives the incident facts, corrects
   * two of them, and asks for a handoff note. A fourth turn is chosen from the agent's note: the
   * user shares the resolution time and asks for the note to be updated. The agent has to keep
   * the facts across turns and use the corrected owner and severity.
   */
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

      // After the handoff note, the user shares the resolution time and asks to update that note.
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

      const facts = acrossTurns(factsInReply, {
        turnIds: ['handoff', 'resolution'],
        aggregate: 'min',
      });
      const handoff = forTurn(
        evaluators.criteria([
          'The note says the Commerce team owns the incident now, not the Payments team',
          'The note gives the current severity as SEV-1, not SEV-2',
          'The note gives the start time as 14:05 UTC',
        ]),
        'handoff'
      );
      const resolution = forFinalTurn(
        evaluators.criteria([
          'The updated note adds the resolution time 15:30 UTC',
          'The updated note keeps the start time, the Commerce team and SEV-1',
        ])
      );
      const tokens = acrossTurns(evaluators.traceBasedEvaluators.outputTokens, {
        aggregate: 'sum',
      });
      const coherence = forConversation(
        createConversationCoherenceEvaluator({
          inferenceClient: inferenceClient.bindTo({ connectorId: evaluationConnector.id }),
          log,
        })
      );
      const completed = createConversationCompletedEvaluator();
      const graded = [facts, handoff, resolution, tokens, coherence, completed];

      const [run] = await executorClient.runExperiment(
        {
          datasets: [dataset],
          task: createConversationTask({
            target: agentBuilderTarget({ client: agentBuilderClient, agentId: AGENT_ID }),
            nextMessage: askForResolutionUpdate,
            maxTurns: 6,
            turnTimeoutMs: TURN_TIMEOUT_MS,
          }),
        },
        graded
      );
      const { outputs, resultsOf } = readRuns(run);

      for (const output of outputs) {
        expect(output.status).toBe('completed');
        const [conversation] = output.conversations;
        expect(conversation.conversationId).toBeDefined();
        expect(conversation.stopReason).toBe('stopped');
        expect(output.turns.map(({ id, source }) => ({ id, source }))).toEqual([
          { id: 'facts', source: 'scripted' },
          { id: 'correction', source: 'scripted' },
          { id: 'handoff', source: 'scripted' },
          { id: 'resolution', source: 'callback' },
        ]);
        // The callback built its turn from the agent's own reply.
        const [, , handoffTurn, resolutionTurn] = output.turns;
        expect(resolutionTurn.message).toContain(handoffTurn.response);
        expectEveryTurnTraced(output);
      }

      for (const { name } of graded) {
        const results = resultsOf(name);
        expect(results.length).toBeGreaterThan(0);
        expect(results.every((result) => result?.label !== 'unavailable')).toBe(true);
      }
      expect(
        resultsOf(tokens.name).every(
          (result) => typeof result?.score === 'number' && result.score > 0
        )
      ).toBe(true);
      expect(resultsOf(completed.name).every((result) => result?.score === 1)).toBe(true);
    }
  );

  /**
   * A simulated user against a model called directly. A second model plays a customer whose
   * order is late, and talks to the model under evaluation until its goal is met. No turn is
   * scripted.
   */
  evaluate(
    'smoke tests: multi-turn simulated user against a model',
    async ({ executorClient, inferenceClient, evaluationConnector, evaluators }) => {
      const judgeClient = inferenceClient.bindTo({ connectorId: evaluationConnector.id });

      const dataset: EvaluationDataset<MultiTurnExample> = {
        name: 'smoke tests: multi-turn simulated user',
        description:
          'A model plays a customer with a late order and talks to the model under evaluation',
        examples: [
          {
            input: {
              simulated_user: {
                instructions:
                  'You ordered the book "The Pragmatic Programmer" (order 1234) eight days ago and it has not arrived. You want to know what to do next, and you would accept a refund. You are polite and brief. Your goal is a clear next step.',
                max_turns: 3,
              },
            },
            output: {
              expected:
                'The assistant gives a clear next step for the late order without inventing order details.',
            },
          },
        ],
      };

      const outcome = forConversation(
        evaluators.criteria([
          'The assistant gives the user a clear next step for the late order',
          'The assistant does not invent details about the order that the user did not give',
        ])
      );
      const tokens = acrossTurns(evaluators.traceBasedEvaluators.outputTokens, {
        aggregate: 'sum',
      });
      const completed = createConversationCompletedEvaluator();

      const [run] = await executorClient.runExperiment(
        {
          datasets: [dataset],
          task: createConversationTask({
            target: inferenceTarget({
              inferenceClient,
              system:
                'You are the customer support assistant of an online bookstore. Help customers with their orders. You cannot look up orders.',
            }),
            nextMessage: createSimulatedUser({ inferenceClient: judgeClient }),
            turnTimeoutMs: TURN_TIMEOUT_MS,
          }),
        },
        [outcome, tokens, completed]
      );
      const { outputs, resultsOf } = readRuns(run);

      for (const output of outputs) {
        expect(output.status).toBe('completed');
        expect(output.turns.length).toBeGreaterThan(0);
        expect(output.turns.length).toBeLessThanOrEqual(3);
        expect(output.turns.every(({ source }) => source === 'callback')).toBe(true);
        expectEveryTurnTraced(output);
      }
      expect(resultsOf(outcome.name).every((result) => result?.label !== 'unavailable')).toBe(true);
      expect(
        resultsOf(tokens.name).every(
          (result) => typeof result?.score === 'number' && result.score > 0
        )
      ).toBe(true);
    }
  );

  /**
   * Grading in Kibana through `_evaluate`. Two judges are saved for the run: one grades a single
   * turn from its trace, the other reads the whole conversation (`transcript` evidence) from a
   * multi-turn subject of every turn's trace.
   */
  evaluate.describe('smoke tests: multi-turn grading in Kibana', () => {
    const connectorId = process.env.SMOKE_TEST_EVAL_CONNECTOR_ID;
    const runId = randomUUID().slice(0, 8);
    const turnJudge = `smoke-turn-answer-${runId}`;
    const transcriptJudge = `smoke-transcript-${runId}`;

    evaluate.beforeAll(async ({ evaluatorClient }) => {
      if (!connectorId) {
        return;
      }
      await evaluatorClient.createEvaluator({
        name: turnJudge,
        description: 'Whether the reply answers the question of its turn',
        judge: {
          system_prompt: 'You grade one reply of an AI assistant.',
          prompt:
            'Question: {{{user_query}}}\n\nReply: {{{agent_response}}}\n\nDoes the reply answer the question?',
          evidence: ['input', 'response'],
          output: { scores: [{ name: 'answers_question', type: 'number' }] },
        },
      });
      await evaluatorClient.createEvaluator({
        name: transcriptJudge,
        description: 'Whether the assistant uses facts corrected earlier in the conversation',
        judge: {
          system_prompt: 'You grade a whole conversation between a user and an AI assistant.',
          prompt:
            'Conversation:\n\n{{{conversation_transcript}}}\n\nDoes the last reply use the facts as the user last corrected them?',
          evidence: ['transcript'],
          output: { scores: [{ name: 'uses_corrections', type: 'number' }] },
        },
      });
    });

    evaluate.afterAll(async ({ evaluatorClient, log }) => {
      if (!connectorId) {
        return;
      }
      for (const name of [turnJudge, transcriptJudge]) {
        await evaluatorClient.deleteEvaluator(name).catch((error: Error) => {
          log.warning(`Failed to delete evaluator "${name}": ${error.message}`);
        });
      }
    });

    evaluate(
      'grades one turn and the whole conversation from traces',
      async ({ executorClient, agentBuilderClient, evaluatorClient }) => {
        evaluate.skip(
          !connectorId,
          'Requires SMOKE_TEST_EVAL_CONNECTOR_ID: the connector Kibana-side judges call'
        );

        const dataset: EvaluationDataset<MultiTurnExample> = {
          name: 'smoke tests: multi-turn grading in Kibana',
          description:
            'Kibana grades a follow-up turn and the whole conversation from their traces',
          examples: [
            {
              input: {
                turns: [
                  { id: 'fact', message: 'My favourite colour is blue. Reply only with "OK".' },
                  {
                    id: 'correction',
                    message: 'Sorry, I got that wrong: it is green. Reply only with "OK".',
                  },
                  {
                    id: 'question',
                    message: 'What is my favourite colour? Answer with one word.',
                  },
                ],
              },
            },
          ],
        };

        const configs = (name: string) => [
          { name, kind: 'LLM' as const, direction: 'maximize' as const, connectorId: connectorId! },
        ];
        // A single-turn `_evaluate` call with the follow-up turn's own trace.
        const [turnEvaluator] = evaluatorClient.toEvaluators(configs(turnJudge));
        const followUp = forTurn(turnEvaluator, 'question');
        // One multi-turn `_evaluate` call with every turn's trace, in order.
        const [conversation] = evaluatorClient.toConversationEvaluators(configs(transcriptJudge));

        const [run] = await executorClient.runExperiment(
          {
            datasets: [dataset],
            task: createConversationTask({
              target: agentBuilderTarget({ client: agentBuilderClient, agentId: AGENT_ID }),
              turnTimeoutMs: TURN_TIMEOUT_MS,
            }),
          },
          [followUp, conversation]
        );
        const { outputs, resultsOf } = readRuns(run);

        for (const output of outputs) {
          expect(output.status).toBe('completed');
          expectEveryTurnTraced(output);
        }
        for (const name of [followUp.name, conversation.name]) {
          const results = resultsOf(name);
          expect(results.length).toBeGreaterThan(0);
          expect(results.every((result) => typeof result?.score === 'number')).toBe(true);
        }
      }
    );
  });
});
