/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { AgentBuilderEvaluationChatClient } from './chat_client';

jest.mock('p-retry', () => (fn: () => Promise<unknown>) => fn());

const makeResponse = (prompts: Array<{ id: string; type: string }> = [], message = 'ok') => ({
  conversation_id: 'conv-1',
  trace_id: undefined,
  steps: [],
  response: { message, prompts },
});

const makeFetch = (responses: object[]) => {
  let call = 0;
  return jest.fn().mockImplementation(() => Promise.resolve(responses[call++]));
};

const mockLog: ToolingLog = {
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

describe('AgentBuilderEvaluationChatClient autoConfirm', () => {
  it('should batch all confirmations from one response into a single continuation POST', async () => {
    const firstResponse = makeResponse(
      [
        { id: 'tools.stop.confirmation', type: 'confirmation' },
        { id: 'tools.delete.confirmation.call-1', type: 'confirmation' },
      ],
      'awaiting'
    );
    const secondResponse = makeResponse([], 'done');

    const fetch = makeFetch([firstResponse, secondResponse]);
    const client = new AgentBuilderEvaluationChatClient(fetch as any, mockLog, 'connector-1');

    const result = await client.converse({
      messages: [{ message: 'go' }],
      options: { autoConfirm: true },
    });

    // Exactly one continuation call, carrying both prompt ids.
    expect(fetch).toHaveBeenCalledTimes(2);
    const continuationBody = JSON.parse(fetch.mock.calls[1][1].body);
    expect(continuationBody.prompts).toEqual({
      'tools.stop.confirmation': { allow: true },
      'tools.delete.confirmation.call-1': { allow: true },
    });
    expect(result.errors).toHaveLength(0);
    expect(result.messages[result.messages.length - 1]).toMatchObject({ message: 'done' });
  });

  it('should loop when the agent emits a fresh confirmation in a later cycle', async () => {
    const fetch = makeFetch([
      makeResponse([{ id: 'tools.a.confirmation.c1', type: 'confirmation' }], 'step1'),
      makeResponse([{ id: 'tools.b.confirmation.c2', type: 'confirmation' }], 'step2'),
      makeResponse([], 'done'),
    ]);
    const client = new AgentBuilderEvaluationChatClient(fetch as any, mockLog, 'connector-1');

    const result = await client.converse({
      messages: [{ message: 'go' }],
      options: { autoConfirm: true },
    });

    expect(fetch).toHaveBeenCalledTimes(3);
    expect(result.errors).toHaveLength(0);
  });

  it('should throw after MAX_AUTO_CONFIRM_ROUNDS consecutive confirmation cycles', async () => {
    const responses = Array.from({ length: 10 }, (_, i) =>
      makeResponse([{ id: `tools.x.confirmation.c${i}`, type: 'confirmation' }], 'pending')
    );
    const fetch = makeFetch(responses);
    const client = new AgentBuilderEvaluationChatClient(fetch as any, mockLog, 'connector-1');

    const result = await client.converse({
      messages: [{ message: 'go' }],
      options: { autoConfirm: true },
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error.message).toMatch(/exceeded.*continuation rounds/);
  });

  it('should return the interrupted round as-is when a non-confirmation prompt is pending', async () => {
    const fetch = makeFetch([
      makeResponse([{ id: 'uuid-ask-1', type: 'ask_user_question' }], 'awaiting your answer'),
    ]);
    const client = new AgentBuilderEvaluationChatClient(fetch as any, mockLog, 'connector-1');

    const result = await client.converse({
      messages: [{ message: 'go' }],
      options: { autoConfirm: true },
    });

    // No continuation should be issued.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.errors).toHaveLength(0);
    expect(result.messages[result.messages.length - 1]).toMatchObject({
      message: 'awaiting your answer',
    });
  });

  it('should make no continuation call when the first response has no prompts', async () => {
    const fetch = makeFetch([makeResponse([], 'done')]);
    const client = new AgentBuilderEvaluationChatClient(fetch as any, mockLog, 'connector-1');

    const result = await client.converse({
      messages: [{ message: 'go' }],
      options: { autoConfirm: true },
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.errors).toHaveLength(0);
  });
});
