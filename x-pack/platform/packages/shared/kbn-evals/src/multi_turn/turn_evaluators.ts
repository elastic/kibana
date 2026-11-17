/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, EvaluatorParams, Example, TaskOutput } from '../types';
import type {
  ConversationResult,
  ConversationTurnExpectation,
  ConversationTurnResult,
} from './types';

type AnyEvaluatorParams = EvaluatorParams<Example, TaskOutput>;

export type TurnScoreAggregate = 'mean' | 'min' | 'max' | 'sum';

const isConversationResult = (output: unknown): output is ConversationResult =>
  typeof output === 'object' &&
  output !== null &&
  Array.isArray((output as ConversationResult).turns) &&
  Array.isArray((output as ConversationResult).messages);

const unavailable = (explanation: string): EvaluationResult => ({
  score: null,
  label: 'unavailable',
  explanation,
});

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

/**
 * The view of one turn an existing single-turn evaluator expects: the turn's message as the
 * question (with the earlier messages as context), its reply as the latest message, its own
 * trace id, and that turn's ground truth as `expected`.
 */
const toTurnParams = (
  conversation: ConversationResult,
  turn: ConversationTurnResult,
  { expected, metadata }: AnyEvaluatorParams
): AnyEvaluatorParams => ({
  input: {
    question: turn.message,
    turnId: turn.id,
    history: conversation.messages.slice(0, turn.index * 2),
  },
  output: {
    messages: [{ message: turn.response }],
    response: turn.response,
    steps: turn.steps,
    traceId: turn.traceId,
    conversationId: conversation.conversationId,
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

const evaluateTurn = (
  evaluator: Evaluator,
  params: AnyEvaluatorParams,
  pickTurn: (conversation: ConversationResult) => ConversationTurnResult | undefined,
  missingTurn: string
): Promise<EvaluationResult> => {
  const { output } = params;
  if (!isConversationResult(output)) {
    return Promise.resolve(unavailable('The task output is not a conversation result'));
  }
  const turn = pickTurn(output);
  if (!turn) {
    return Promise.resolve(unavailable(missingTurn));
  }
  return evaluator.evaluate(toTurnParams(output, turn, params));
};

/**
 * Grades one turn with an existing evaluator. The score is reported as `<name> [<turnId>]`,
 * so turns graded by the same evaluator don't collide.
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

/** Grades the last turn of the conversation with an existing evaluator. */
export const forFinalTurn = (evaluator: Evaluator): Evaluator =>
  withName(evaluator, `${evaluator.name} [final turn]`, (params) =>
    evaluateTurn(evaluator, params, ({ turns }) => turns.at(-1), 'The conversation has no turns')
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

/**
 * Grades every turn (or the listed ones) with an existing evaluator and reports one score for
 * the conversation, so each example still contributes one score per evaluator. Use `sum` for
 * trace metrics such as tokens, and `mean` or `min` for judges. Turns without a score are left
 * out of the aggregate and listed in the metadata.
 */
export const acrossTurns = (
  evaluator: Evaluator,
  {
    aggregate = 'mean',
    turnIds,
  }: { aggregate?: TurnScoreAggregate; turnIds?: readonly string[] } = {}
): Evaluator =>
  withName(evaluator, `${evaluator.name} [turns: ${aggregate}]`, async (params) => {
    const { output } = params;
    if (!isConversationResult(output)) {
      return unavailable('The task output is not a conversation result');
    }

    const turns = turnIds ? output.turns.filter(({ id }) => turnIds.includes(id)) : output.turns;
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
  });

/**
 * Grades the whole conversation with a judge that reads a transcript, such as the
 * conversation coherence evaluator. The judge gets the ordered messages instead of the raw
 * task output, and the example's overall `expected`.
 */
export const forConversation = (evaluator: Evaluator): Evaluator =>
  withName(evaluator, `${evaluator.name} [conversation]`, (params) => {
    const { output, expected } = params;
    if (!isConversationResult(output)) {
      return Promise.resolve(unavailable('The task output is not a conversation result'));
    }
    const overall = (expected as { expected?: unknown } | null | undefined)?.expected;
    return evaluator.evaluate({
      ...params,
      output: {
        conversationId: output.conversationId,
        messages: output.messages.map(({ role, message }) => ({ role, message })),
      },
      // Same shape as a turn's expectation, so judges that read `expected.expected` work on both.
      expected: overall !== undefined ? { expected: overall } : null,
    });
  });
