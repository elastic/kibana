/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { DecisionQuestion } from '@kbn/inference-common';
import { createInferenceProviderError, createInferenceRequestError } from '@kbn/inference-common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { DecisionModelProvider } from './decision_model';
import { DecisionProviderUnavailableError, isDecisionProviderUnavailableError } from './types';

const shouldRespond: DecisionQuestion = {
  type: 'predicate',
  instructions: 'Should the agent respond?',
};

const topic: DecisionQuestion = {
  type: 'choice',
  instructions: 'Pick one',
  choices: { a: 'A', b: 'B' },
};

const input = 'hello';

const setup = ({ inferenceId }: { inferenceId?: string } = {}) => {
  const decide = jest.fn();
  const request = httpServerMock.createKibanaRequest();
  const getClient = jest.fn().mockReturnValue({ decide });
  const inference = { getClient } as unknown as InferenceServerStart;

  const provider = new DecisionModelProvider({
    inference,
    inferenceId,
    timeoutMs: 1000,
    unavailableTtlMs: 1000,
  });

  const run = (questions: DecisionQuestion[] = [shouldRespond]) =>
    provider.decide({ request, input, questions });

  return { run, provider, decide, getClient, request };
};

describe('DecisionModelProvider', () => {
  it('asks one question with the configured inference id, as the requesting user', async () => {
    const { run, decide, getClient, request } = setup({ inferenceId: 'my-decision' });

    decide.mockResolvedValue({
      inferenceId: 'my-decision',
      answer: { type: 'predicate', probability: 0.94 },
    });

    const result = await run();

    expect(getClient).toHaveBeenCalledWith({ request });
    expect(decide).toHaveBeenCalledWith(
      { input, inferenceId: 'my-decision', abortSignal: expect.any(AbortSignal) },
      shouldRespond
    );
    expect(result).toEqual({
      inferenceId: 'my-decision',
      answers: [{ type: 'predicate', probability: 0.94 }],
    });
  });

  it('asks several questions in one call and keeps their order', async () => {
    const { run, decide } = setup();
    const answers = [
      { type: 'predicate', probability: 0.6 },
      { type: 'choice', choice: 'a', confidence: 0.8, probabilities: { a: 0.8, b: 0.2 } },
    ];

    decide.mockResolvedValue({ inferenceId: '.jev-1.13-decision', answers });

    const result = await run([shouldRespond, topic]);

    expect(decide).toHaveBeenCalledWith(
      { input, inferenceId: undefined, abortSignal: expect.any(AbortSignal) },
      shouldRespond,
      topic
    );
    expect(result).toEqual({ inferenceId: '.jev-1.13-decision', answers });
  });

  it('is unavailable when decide() reports no decision endpoint', async () => {
    const { run, provider, decide } = setup();

    decide.mockRejectedValue(
      createInferenceRequestError('No decision inference endpoint on the cluster', 404)
    );

    await expect(run()).rejects.toBeInstanceOf(DecisionProviderUnavailableError);
    expect(provider.isAvailable()).toBe(false);
  });

  it('rethrows other errors as retryable failures', async () => {
    const { run, provider, decide } = setup({ inferenceId: 'my-decision' });

    decide.mockRejectedValue(createInferenceProviderError('overloaded', { status: 503 }));

    const error = await run().catch((thrown) => thrown);

    expect(error.message).toBe('overloaded');
    expect(isDecisionProviderUnavailableError(error)).toBe(false);
    expect(provider.isAvailable()).toBe(true);
  });
});
