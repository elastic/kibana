/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, EvaluatorParams, Example, TaskOutput } from '../types';
import type {
  ConversationMessage,
  ConversationTurnExpectation,
  ConversationTurnResult,
  MultiTurnResult,
} from './types';

type AnyEvaluatorParams = EvaluatorParams<Example, TaskOutput>;

export type TurnScoreAggregate = 'mean' | 'min' | 'max' | 'sum';

export const isMultiTurnResult = (output: unknown): output is MultiTurnResult =>
  typeof output === 'object' &&
  output !== null &&
  Array.isArray((output as MultiTurnResult).turns) &&
  Array.isArray((output as MultiTurnResult).messages) &&
  Array.isArray((output as MultiTurnResult).conversations);

const unavailable = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation,
});

const NOT_A_CONVERSATION = 'The task output is not a multi-turn result';

const findTurnExpectation = (
  expected: unknown,
  turnId: string
): ConversationTurnExpectation | undefined => {
  const turns = (expected as { turns?: unknown } | null | undefined)?.turns;
  if (!Array.isArray(turns)) {
    return undefined;
  }
  return turns.find(
    (turn): turn is ConversationTurnExpectation =>
      typeof turn === 'object' && turn !== null && (turn as { id?: unknown }).id === turnId
  );
};

/** The example's overall ground truth, without the per-turn entries. */
export const overallExpectation = (expected: unknown): Record<string, unknown> | null => {
  if (typeof expected !== 'object' || expected === null) {
    return null;
  }
  const rest: Record<string, unknown> = { ...(expected as Record<string, unknown>) };
  delete rest.turns;
  return Object.keys(rest).length > 0 ? rest : null;
};

const historyBefore = (
  messages: readonly ConversationMessage[],
  turn: ConversationTurnResult
): ConversationMessage[] =>
  messages
    .filter(({ conversationKey }) => conversationKey === turn.conversationKey)
    .slice(0, turn.index * 2);

/**
 * The view of one turn an existing single-turn evaluator expects: the turn's message as the
 * question (with the earlier messages of its conversation as context), its reply as the latest
 * message, its own trace, and that turn's ground truth as `expected`.
 */
const toTurnParams = (
  result: MultiTurnResult,
  turn: ConversationTurnResult,
  { expected, metadata }: AnyEvaluatorParams
): AnyEvaluatorParams => ({
  input: {
    question: turn.message,
    turnId: turn.id,
    conversationKey: turn.conversationKey,
    history: historyBefore(result.messages, turn),
  },
  output: {
    messages: [{ message: turn.response }],
    response: turn.response,
    steps: turn.steps,
    traceId: turn.traceId,
    traceIds: turn.traceIds,
    conversationId: result.conversations.find(({ key }) => key === turn.conversationKey)
      ?.conversationId,
  },
  expected: findTurnExpectation(expected, turn.id) ?? null,
  metadata,
});

const withName = (
  evaluator: Evaluator,
  name: string,
  evaluate: Evaluator['evaluate']
): Evaluator => ({
  name,
  kind: evaluator.kind,
  direction: evaluator.direction,
  evaluate,
  ...(evaluator.getModel ? { getModel: evaluator.getModel } : {}),
  ...(evaluator.getVersion ? { getVersion: evaluator.getVersion } : {}),
});

const evaluateTurn = async (
  evaluator: Evaluator,
  params: AnyEvaluatorParams,
  pickTurn: (result: MultiTurnResult) => ConversationTurnResult | undefined,
  missingTurn: string
): Promise<EvaluationResult> => {
  const { output } = params;
  if (!isMultiTurnResult(output)) {
    return unavailable(NOT_A_CONVERSATION);
  }
  const turn = pickTurn(output);
  if (!turn) {
    return unavailable(
      output.error ? `${missingTurn}; the run failed: ${output.error.message}` : missingTurn
    );
  }
  return evaluator.evaluate(toTurnParams(output, turn, params));
};

/**
 * Grades one turn with an existing evaluator. The score is reported as `<name> [<turnId>]`, so
 * turns graded by the same evaluator don't collide.
 */
export const forTurn = (evaluator: Evaluator, turnId: string): Evaluator =>
  withName(evaluator, `${evaluator.name} [${turnId}]`, (params) =>
    evaluateTurn(
      evaluator,
      params,
      ({ turns }) => turns.find(({ id }) => id === turnId),
      `Turn "${turnId}" did not run`
    )
  );

/** Grades the last turn of the run (of the last conversation) with an existing evaluator. */
export const forFinalTurn = (evaluator: Evaluator): Evaluator =>
  withName(evaluator, `${evaluator.name} [final turn]`, (params) =>
    evaluateTurn(evaluator, params, ({ turns }) => turns.at(-1), 'No turn ran')
  );

const aggregateScores = (scores: number[], aggregate: TurnScoreAggregate): number => {
  switch (aggregate) {
    case 'min':
      return Math.min(...scores);
    case 'max':
      return Math.max(...scores);
    case 'sum':
      return scores.reduce((total, score) => total + score, 0);
    case 'mean':
      return scores.reduce((total, score) => total + score, 0) / scores.length;
  }
};

export interface AcrossTurnsOptions {
  aggregate?: TurnScoreAggregate;
  /** Only grade these turns. */
  turnIds?: readonly string[];
  /** Only grade the turns of this conversation. */
  conversation?: string;
}

/**
 * Grades every turn (or the selected ones) with an existing evaluator and reports one score for
 * the example, so each example still contributes one score per evaluator. Use `sum` for trace
 * metrics such as tokens, and `mean` or `min` for judges. Turns without a score are left out of
 * the aggregate and listed in the metadata.
 */
export const acrossTurns = (
  evaluator: Evaluator,
  { aggregate = 'mean', turnIds, conversation }: AcrossTurnsOptions = {}
): Evaluator =>
  withName(
    evaluator,
    `${evaluator.name} [${conversation ? `${conversation} ` : ''}turns: ${aggregate}]`,
    async (params) => {
      const { output } = params;
      if (!isMultiTurnResult(output)) {
        return unavailable(NOT_A_CONVERSATION);
      }

      const turns = output.turns.filter(
        ({ id, conversationKey }) =>
          (!turnIds || turnIds.includes(id)) && (!conversation || conversationKey === conversation)
      );
      if (turns.length === 0) {
        return unavailable('No turns to grade');
      }

      const perTurn: Array<{ id: string; result: EvaluationResult }> = [];
      for (const turn of turns) {
        perTurn.push({
          id: turn.id,
          result: await evaluator.evaluate(toTurnParams(output, turn, params)),
        });
      }

      const scores = perTurn
        .map(({ result }) => result.score)
        .filter((score): score is number => typeof score === 'number' && Number.isFinite(score));

      return {
        score: scores.length > 0 ? aggregateScores(scores, aggregate) : null,
        ...(scores.length === 0 ? { label: 'unavailable' } : {}),
        explanation: perTurn
          .map(({ id, result }) => `${id}: ${result.score ?? result.label ?? 'no score'}`)
          .join('; '),
        metadata: {
          aggregate,
          scored_turns: scores.length,
          turns: perTurn.map(({ id, result }) => ({
            id,
            score: result.score ?? null,
            label: result.label ?? null,
            explanation: result.explanation ?? null,
          })),
        },
      };
    }
  );

/**
 * Grades the transcript with a judge that reads a whole conversation, such as the conversation
 * coherence evaluator. The judge gets the ordered messages (of one conversation, or of all of
 * them) instead of the raw task output, and the example's overall `expected`.
 */
export const forConversation = (
  evaluator: Evaluator,
  { conversation }: { conversation?: string } = {}
): Evaluator =>
  withName(
    evaluator,
    `${evaluator.name} [${conversation ? `conversation: ${conversation}` : 'conversation'}]`,
    async (params) => {
      const { output, expected } = params;
      if (!isMultiTurnResult(output)) {
        return unavailable(NOT_A_CONVERSATION);
      }
      const messages = output.messages.filter(
        ({ conversationKey }) => !conversation || conversationKey === conversation
      );
      if (messages.length === 0) {
        return unavailable('No messages to grade');
      }
      return evaluator.evaluate({
        ...params,
        output: {
          messages: messages.map(({ role, message, conversationKey }) => ({
            role,
            message,
            conversation: conversationKey,
          })),
        },
        expected: overallExpectation(expected),
      });
    }
  );

/**
 * Scores 1 when every conversation of the example ran to the end, and 0 when a step failed. The
 * explanation says where it failed, so preparation, agent-call and callback failures show up with
 * the other scores instead of as a missing run.
 */
export const createConversationCompletedEvaluator = (): Evaluator => ({
  name: 'Conversation completed',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    if (!isMultiTurnResult(output)) {
      return unavailable(NOT_A_CONVERSATION);
    }
    const { status, error, turns, cleanupErrors } = output;
    return {
      score: status === 'completed' ? 1 : 0,
      label: status,
      explanation: error
        ? `${error.phase} failed${error.turnId ? ` at turn "${error.turnId}"` : ''}: ${
            error.message
          }`
        : `${turns.length} turn(s) completed`,
      metadata: {
        turns: turns.length,
        ...(error ? { phase: error.phase, outcome: error.outcome ?? null } : {}),
        ...(cleanupErrors ? { cleanup_errors: cleanupErrors } : {}),
      },
    };
  },
});
