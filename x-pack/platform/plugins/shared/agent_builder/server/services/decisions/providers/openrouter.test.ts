/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DecisionQuestion } from '@kbn/agent-builder-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { createOpenRouterDecisionProvider, decideWithOpenRouter } from './openrouter';
import { DecisionProviderUnavailableError, isDecisionProviderUnavailableError } from './types';

const config = {
  apiKey: 'test-key',
  model: 'typesafe/jev-1.13',
  url: 'https://openrouter.test/api/v1',
};

const questions: Record<string, DecisionQuestion> = {
  should_respond: { type: 'predicate', instructions: 'Should the agent respond?' },
  pick: { type: 'choice', instructions: 'Pick one', choices: { a: 'first', b: '' } },
  severity: {
    type: 'score',
    instructions: 'How severe?',
    levels: [
      { label: 'low', description: 'minor' },
      { label: 'high', description: '' },
    ],
  },
};

const okResponse = {
  provider: 'typesafe',
  answers: {
    should_respond: { type: 'noul', noul: 0.91 },
    pick: { type: 'choice', choice: 'a', confidence: 0.7, probabilities: { a: 0.8, b: 0.2 } },
    severity: { type: 'score', score: 0.3, confidence: 0.6, probabilities: { '0': 0.7, '1': 0.3 } },
  },
};

const mockFetch = (status: number, body: unknown) =>
  jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );

describe('decideWithOpenRouter', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the questions in the OpenRouter Decisions format', async () => {
    const fetchSpy = mockFetch(200, okResponse);

    await decideWithOpenRouter({ config, input: 'hello', questions });

    const [url, init] = fetchSpy.mock.calls[0];

    expect(url).toBe('https://openrouter.test/api/v1/alpha/decisions');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual(expect.objectContaining({ Authorization: 'Bearer test-key' }));
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'typesafe/jev-1.13',
      state: 'hello',
      questions: {
        should_respond: { type: 'noul', instructions: 'Should the agent respond?' },
        pick: { type: 'choice', instructions: 'Pick one', criteria: { a: 'first', b: null } },
        severity: { type: 'score', instructions: 'How severe?', criteria: ['low: minor', 'high'] },
      },
      provider: { only: ['typesafe'], data_collection: 'deny', zdr: true },
    });
  });

  it('converts the answers to decision answers', async () => {
    mockFetch(200, okResponse);

    const answers = await decideWithOpenRouter({ config, input: 'hello', questions });

    expect(answers).toEqual({
      should_respond: { type: 'predicate', probability: 0.91 },
      pick: { type: 'choice', choice: 'a', confidence: 0.7, probabilities: { a: 0.8, b: 0.2 } },
      severity: {
        type: 'score',
        score: 0.3,
        confidence: 0.6,
        probabilities: { low: 0.7, high: 0.3 },
      },
    });
  });

  it('throws with the upstream message on a non-200 response', async () => {
    mockFetch(401, { error: { message: 'No auth credentials found' } });

    await expect(decideWithOpenRouter({ config, input: 'hello', questions })).rejects.toThrow(
      /401.*No auth credentials found/
    );
  });

  it('throws when a question has no answer', async () => {
    mockFetch(200, { answers: { should_respond: { type: 'noul', noul: 0.5 } } });

    await expect(decideWithOpenRouter({ config, input: 'hello', questions })).rejects.toThrow(
      /pick/
    );
  });

  it('throws when an answer has the wrong type', async () => {
    mockFetch(200, { answers: { should_respond: { type: 'choice', choice: 'yes' } } });

    await expect(
      decideWithOpenRouter({
        config,
        input: 'hello',
        questions: { should_respond: questions.should_respond },
      })
    ).rejects.toThrow(/should_respond/);
  });

  it('does not put the api key in errors', async () => {
    mockFetch(500, { error: { message: 'boom' } });

    await expect(decideWithOpenRouter({ config, input: 'hello', questions })).rejects.toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('test-key') })
    );
  });
});

describe('createOpenRouterDecisionProvider', () => {
  const run = () =>
    createOpenRouterDecisionProvider(config).decide({
      request: httpServerMock.createKibanaRequest(),
      input: 'hello',
      questions: { should_respond: questions.should_respond },
      signal: new AbortController().signal,
    });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reports the model as the inference id', async () => {
    mockFetch(200, { answers: { should_respond: { type: 'noul', noul: 0.4 } } });

    await expect(run()).resolves.toEqual({
      inferenceId: 'openrouter:typesafe/jev-1.13',
      answers: { should_respond: { type: 'predicate', probability: 0.4 } },
    });
  });

  it.each([401, 403])('is unavailable when OpenRouter answers %s', async (status) => {
    mockFetch(status, { error: { message: 'bad key' } });

    await expect(run()).rejects.toBeInstanceOf(DecisionProviderUnavailableError);
  });

  it.each([404, 429, 500])(
    'fails with a retryable error when OpenRouter answers %s',
    async (status) => {
      mockFetch(status, { error: { message: 'nope' } });

      const error = await run().catch((thrown) => thrown);

      expect(error).toBeInstanceOf(Error);
      expect(isDecisionProviderUnavailableError(error)).toBe(false);
    }
  );
});
