/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentBuilderClientResponse,
  AgentBuilderConverseParams,
} from '../utils/agent_builder_client';
import { ConversationRunError, createConversationTask, runConversation } from './run_conversation';

const reply = (
  overrides: Partial<AgentBuilderClientResponse> = {}
): AgentBuilderClientResponse => ({
  message: 'ok',
  steps: [],
  prompts: [],
  conversationId: 'conv-1',
  ...overrides,
});

const createClient = (responses: Array<AgentBuilderClientResponse | Error>) => {
  const converse = jest.fn(async (_params: AgentBuilderConverseParams) => {
    const next = responses.shift();
    if (!next) {
      throw new Error('No scripted response left');
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  return { converse };
};

describe('runConversation', () => {
  it('sends the scripted turns in order on one conversation, each with its own trace', async () => {
    const client = createClient([
      reply({ message: 'Payments', traceId: 'trace-1' }),
      reply({ message: 'Commerce', traceId: 'trace-2' }),
    ]);

    const result = await runConversation({
      client,
      agentId: 'agent',
      turns: [
        { id: 't1', message: 'Who owns checkout?' },
        { id: 't2', message: 'Who owns checkout now?' },
      ],
    });

    expect(client.converse.mock.calls.map(([params]) => params)).toEqual([
      { agentId: 'agent', input: 'Who owns checkout?', conversationId: undefined },
      { agentId: 'agent', input: 'Who owns checkout now?', conversationId: 'conv-1' },
    ]);
    expect(result.conversationId).toBe('conv-1');
    expect(result.stopReason).toBe('turns_exhausted');
    expect(
      result.turns.map(({ id, index, source, response, traceId }) => ({
        id,
        index,
        source,
        response,
        traceId,
      }))
    ).toEqual([
      { id: 't1', index: 0, source: 'scripted', response: 'Payments', traceId: 'trace-1' },
      { id: 't2', index: 1, source: 'scripted', response: 'Commerce', traceId: 'trace-2' },
    ]);
    expect(result.messages).toEqual([
      { role: 'user', message: 'Who owns checkout?', turnId: 't1' },
      { role: 'assistant', message: 'Payments', turnId: 't1' },
      { role: 'user', message: 'Who owns checkout now?', turnId: 't2' },
      { role: 'assistant', message: 'Commerce', turnId: 't2' },
    ]);
  });

  it('answers the prompts the agent is waiting on with the next turn', async () => {
    const question = {
      id: 'prompt-1',
      type: 'ask_user_question',
      questions: [{ question: 'Which index?', options: [], multi_select: false }],
    };
    const client = createClient([reply({ prompts: [question] }), reply({ message: 'Done' })]);

    const result = await runConversation({
      client,
      agentId: 'agent',
      turns: [
        { id: 't1', message: 'Create a rule' },
        { id: 't2', message: 'logs-*' },
      ],
    });

    expect(client.converse.mock.calls[1][0]).toEqual({
      agentId: 'agent',
      input: 'logs-*',
      conversationId: 'conv-1',
      promptResponses: { 'prompt-1': { answers: [{ custom: 'logs-*' }] } },
    });
    expect(result.turns[0].prompts).toEqual([question]);
    expect(result.turns[1].answeredPrompts).toBe(true);
  });

  it('asks nextMessage for more turns until it returns undefined', async () => {
    const client = createClient([reply({ message: 'first' }), reply({ message: 'second' })]);
    const nextMessage = jest.fn(({ turns }) =>
      turns.length < 2
        ? { id: `chosen-${turns.length}`, message: `reply to ${turns.at(-1).response}` }
        : undefined
    );

    const result = await runConversation({
      client,
      agentId: 'agent',
      turns: [{ id: 't1', message: 'hello' }],
      nextMessage,
    });

    expect(result.turns.map(({ id, source }) => ({ id, source }))).toEqual([
      { id: 't1', source: 'scripted' },
      { id: 'chosen-1', source: 'callback' },
    ]);
    expect(client.converse.mock.calls[1][0].input).toBe('reply to first');
    expect(result.stopReason).toBe('stopped');
  });

  it('stops at maxTurns', async () => {
    const client = createClient([reply(), reply(), reply()]);

    const result = await runConversation({
      client,
      agentId: 'agent',
      turns: [],
      nextMessage: ({ turns }) => ({ id: `t${turns.length}`, message: 'again' }),
      maxTurns: 2,
    });

    expect(result.turns).toHaveLength(2);
    expect(result.stopReason).toBe('max_turns');
  });

  it('keeps the completed turns when a later turn fails', async () => {
    const client = createClient([reply({ message: 'Payments' }), new Error('timeout')]);

    const error = await runConversation({
      client,
      agentId: 'agent',
      turns: [
        { id: 't1', message: 'Who owns checkout?' },
        { id: 't2', message: 'Who owns checkout now?' },
      ],
    }).then(
      () => undefined,
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(ConversationRunError);
    const { message, result } = error as ConversationRunError;
    expect(message).toContain('Turn "t2" failed after 1 completed turn(s): timeout');
    expect(result.turns.map(({ id }) => id)).toEqual(['t1']);
  });

  it('refuses duplicate turn ids, since per-turn scores are named by them', async () => {
    await expect(
      runConversation({
        client: createClient([]),
        agentId: 'agent',
        turns: [
          { id: 't1', message: 'a' },
          { id: 't1', message: 'b' },
        ],
      })
    ).rejects.toThrow('Turn id "t1" is used more than once');
  });
});

describe('createConversationTask', () => {
  it('runs the example turns', async () => {
    const client = createClient([reply({ message: 'hi' })]);
    const task = createConversationTask({ client, agentId: 'agent' });

    const result = await task({ input: { turns: [{ id: 't1', message: 'hello' }] } });

    expect(result.turns.map(({ response }) => response)).toEqual(['hi']);
  });

  it('refuses an example without turns when there is no nextMessage', async () => {
    const task = createConversationTask({ client: createClient([]), agentId: 'agent' });

    await expect(task({ input: { turns: [] } })).rejects.toThrow(
      'A multi-turn example needs input.turns or a nextMessage callback'
    );
  });
});
