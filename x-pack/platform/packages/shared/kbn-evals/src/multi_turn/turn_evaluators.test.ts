/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvaluatorParams, Example, TaskOutput } from '../types';
import { acrossTurns, forConversation, forFinalTurn, forTurn } from './turn_evaluators';
import type { ConversationResult } from './types';

const conversation: ConversationResult = {
  conversationId: 'conv-1',
  stopReason: 'turns_exhausted',
  turns: [
    {
      id: 't1',
      index: 0,
      source: 'scripted',
      message: 'Who owns checkout?',
      answeredPrompts: false,
      response: 'Payments',
      steps: [],
      prompts: [],
      traceId: 'trace-1',
      durationMs: 1,
    },
    {
      id: 't2',
      index: 1,
      source: 'scripted',
      message: 'Who owns checkout now?',
      answeredPrompts: false,
      response: 'Commerce',
      steps: [],
      prompts: [],
      traceId: 'trace-2',
      durationMs: 1,
    },
  ],
  messages: [
    { role: 'user', message: 'Who owns checkout?', turnId: 't1' },
    { role: 'assistant', message: 'Payments', turnId: 't1' },
    { role: 'user', message: 'Who owns checkout now?', turnId: 't2' },
    { role: 'assistant', message: 'Commerce', turnId: 't2' },
  ],
};

const expected = {
  expected: 'Checkout ownership changed from Payments to Commerce.',
  turns: [
    { id: 't1', expected: 'Payments' },
    { id: 't2', expected: 'Commerce' },
  ],
};

const params: EvaluatorParams<Example, TaskOutput> = {
  input: { turns: [] },
  // The executor adds the task span's trace id next to the task output.
  output: { ...conversation, traceId: 'task-trace' },
  expected,
  metadata: null,
};

const createInner = (scores: Record<string, number | null> = {}) => {
  const evaluate = jest.fn(async ({ input }: EvaluatorParams<Example, TaskOutput>) => {
    const turnId = (input as { turnId?: string } | undefined)?.turnId ?? 'conversation';
    return { score: turnId in scores ? scores[turnId] : 1 };
  });
  const evaluator: Evaluator = {
    name: 'Correctness',
    kind: 'LLM',
    direction: 'maximize',
    evaluate,
    getModel: () => ({ id: 'judge' }),
  };
  return { evaluator, evaluate };
};

describe('forTurn', () => {
  it('gives the evaluator the turn as a single-turn run, with its own trace and expectation', async () => {
    const { evaluator, evaluate } = createInner();

    const wrapped = forTurn(evaluator, 't2');
    await wrapped.evaluate(params);

    expect(wrapped.name).toBe('Correctness [t2]');
    expect(wrapped.getModel?.()).toEqual({ id: 'judge' });
    expect(evaluate).toHaveBeenCalledWith({
      input: {
        question: 'Who owns checkout now?',
        turnId: 't2',
        history: conversation.messages.slice(0, 2),
      },
      output: {
        messages: [{ message: 'Commerce' }],
        response: 'Commerce',
        steps: [],
        traceId: 'trace-2',
        conversationId: 'conv-1',
      },
      expected: { id: 't2', expected: 'Commerce' },
      metadata: null,
    });
  });

  it('reports a turn that did not run as unavailable', async () => {
    const { evaluator, evaluate } = createInner();

    const result = await forTurn(evaluator, 't9').evaluate(params);

    expect(result).toEqual({
      score: null,
      label: 'unavailable',
      explanation: 'Turn "t9" did not run',
    });
    expect(evaluate).not.toHaveBeenCalled();
  });

  it('reports a task output that is not a conversation as unavailable', async () => {
    const { evaluator } = createInner();

    const result = await forTurn(evaluator, 't1').evaluate({ ...params, output: { message: 'x' } });

    expect(result.label).toBe('unavailable');
  });
});

describe('forFinalTurn', () => {
  it('grades the last turn', async () => {
    const { evaluator, evaluate } = createInner();

    const wrapped = forFinalTurn(evaluator);
    await wrapped.evaluate(params);

    expect(wrapped.name).toBe('Correctness [final turn]');
    expect(evaluate.mock.calls[0][0].input).toMatchObject({ turnId: 't2' });
  });
});

describe('acrossTurns', () => {
  it('reports one score for the conversation and lists the turn scores', async () => {
    const { evaluator } = createInner({ t1: 1, t2: 0.5 });

    const wrapped = acrossTurns(evaluator);
    const result = await wrapped.evaluate(params);

    expect(wrapped.name).toBe('Correctness [turns: mean]');
    expect(result.score).toBe(0.75);
    expect(result.explanation).toBe('t1: 1; t2: 0.5');
    expect(result.metadata).toEqual({
      aggregate: 'mean',
      scored_turns: 2,
      turns: [
        { id: 't1', score: 1, label: null, explanation: null },
        { id: 't2', score: 0.5, label: null, explanation: null },
      ],
    });
  });

  it('sums trace metrics and leaves unscored turns out', async () => {
    const { evaluator } = createInner({ t1: 120, t2: null });

    const result = await acrossTurns(evaluator, { aggregate: 'sum' }).evaluate(params);

    expect(result.score).toBe(120);
    expect(result.metadata).toMatchObject({ scored_turns: 1 });
  });

  it('only grades the listed turns', async () => {
    const { evaluator, evaluate } = createInner();

    await acrossTurns(evaluator, { turnIds: ['t2'] }).evaluate(params);

    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(evaluate.mock.calls[0][0].input).toMatchObject({ turnId: 't2' });
  });
});

describe('forConversation', () => {
  it('gives the judge the ordered messages and the overall expectation', async () => {
    const { evaluator, evaluate } = createInner();

    const wrapped = forConversation(evaluator);
    await wrapped.evaluate(params);

    expect(wrapped.name).toBe('Correctness [conversation]');
    expect(evaluate).toHaveBeenCalledWith({
      input: { turns: [] },
      output: {
        conversationId: 'conv-1',
        messages: conversation.messages.map(({ role, message }) => ({ role, message })),
      },
      expected: { expected: 'Checkout ownership changed from Payments to Commerce.' },
      metadata: null,
    });
  });
});
