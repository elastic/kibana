/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
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
  const elasticsearch = elasticsearchServiceMock.createStart();
  const scopedClient = elasticsearchServiceMock.createScopedClusterClient();

  elasticsearch.client.asScoped.mockReturnValue(scopedClient);

  const provider = new DecisionModelProvider({
    inference,
    elasticsearch,
    inferenceId,
    timeoutMs: 1000,
    unavailableTtlMs: 1000,
  });

  const run = (questions: DecisionQuestion[] = [shouldRespond]) =>
    provider.decide({ request, input, questions });

  return {
    run,
    provider,
    decide,
    getClient,
    request,
    listEndpoints: scopedClient.asCurrentUser.transport.request,
  };
};

describe('DecisionModelProvider', () => {
  it('asks with the configured inference id, as the requesting user, without listing endpoints', async () => {
    const { run, decide, getClient, request, listEndpoints } = setup({
      inferenceId: 'my-decision',
    });

    decide.mockResolvedValue({ answers: [{ type: 'predicate', probability: 0.94 }] });

    const result = await run();

    expect(listEndpoints).not.toHaveBeenCalled();
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

  it('uses the first decision endpoint the cluster lists when none is configured', async () => {
    const { run, decide, listEndpoints } = setup();

    listEndpoints.mockResolvedValue({
      endpoints: [{ inference_id: '.jev-1.13-decision' }, { inference_id: '.other-decision' }],
    });
    decide.mockResolvedValue({ answers: [{ type: 'predicate', probability: 0.6 }] });

    const result = await run();

    expect(listEndpoints.mock.calls[0][0]).toEqual({
      method: 'GET',
      path: '/_inference/decision/_all',
    });
    expect(decide.mock.calls[0][0]).toEqual(
      expect.objectContaining({ inferenceId: '.jev-1.13-decision' })
    );
    expect(result.inferenceId).toBe('.jev-1.13-decision');
  });

  it('asks several questions in one call and keeps their order', async () => {
    const { run, decide } = setup({ inferenceId: 'my-decision' });
    const answers = [
      { type: 'predicate', probability: 0.6 },
      { type: 'choice', choice: 'a', confidence: 0.8, probabilities: { a: 0.8, b: 0.2 } },
    ];

    decide.mockResolvedValue({ answers });

    const result = await run([shouldRespond, topic]);

    expect(decide).toHaveBeenCalledWith(expect.anything(), shouldRespond, topic);
    expect(result).toEqual({ inferenceId: 'my-decision', answers });
  });

  it('is unavailable when the cluster lists no decision endpoint', async () => {
    const { run, provider, decide, listEndpoints } = setup();

    listEndpoints.mockResolvedValue({ endpoints: [] });

    await expect(run()).rejects.toBeInstanceOf(DecisionProviderUnavailableError);
    expect(decide).not.toHaveBeenCalled();
    expect(provider.isAvailable()).toBe(false);
  });

  it('is unavailable when decide() reports the endpoint does not exist', async () => {
    const { run, provider, decide } = setup({ inferenceId: 'missing' });

    decide.mockRejectedValue(createInferenceRequestError('Inference endpoint not found', 404));

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
