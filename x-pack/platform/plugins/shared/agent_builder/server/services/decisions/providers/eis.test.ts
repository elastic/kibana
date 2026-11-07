/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { DecisionQuestion } from '@kbn/agent-builder-server';
import decisionResponse from './__fixtures__/decision_response.json';
import decisionEndpoints from './__fixtures__/decision_endpoints.json';
import { EisDecisionProvider } from './eis';
import { DecisionProviderUnavailableError, isDecisionProviderUnavailableError } from './types';

const shouldRespond: DecisionQuestion = {
  type: 'predicate',
  instructions: 'Should the agent respond?',
};
const questions = [shouldRespond];

const input = 'hello';

const responseError = (statusCode: number, reason: string) =>
  new errors.ResponseError(
    elasticsearchClientMock.createApiResponse({
      statusCode,
      body: { error: { type: 'error', reason } },
    })
  );

const setup = ({ inferenceId }: { inferenceId?: string } = {}) => {
  const elasticsearch = elasticsearchServiceMock.createStart();
  const scopedClient = elasticsearchServiceMock.createScopedClusterClient();

  elasticsearch.client.asScoped.mockReturnValue(scopedClient);

  const provider = new EisDecisionProvider({
    elasticsearch,
    inferenceId,
    timeoutMs: 1000,
    unavailableTtlMs: 1000,
  });
  const run = () =>
    provider.decide({
      request: httpServerMock.createKibanaRequest(),
      input,
      questions,
    });

  return { run, provider, transportRequest: scopedClient.asCurrentUser.transport.request };
};

describe('EisDecisionProvider', () => {
  it('uses the configured inference id without listing endpoints', async () => {
    const { run, transportRequest } = setup({ inferenceId: 'my-decision' });

    transportRequest.mockResolvedValue(decisionResponse);

    const result = await run();

    expect(transportRequest).toHaveBeenCalledTimes(1);
    expect(transportRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        path: '/_inference/decision/my-decision',
        body: { input, task_settings: { questions: { question_1: shouldRespond } } },
      })
    );
    expect(result).toEqual({
      inferenceId: 'my-decision',
      answers: [{ type: 'predicate', probability: 0.94 }],
    });
  });

  it('lists decision endpoints and uses the first one', async () => {
    const { run, transportRequest } = setup();

    transportRequest.mockImplementation(async ({ method }) =>
      method === 'GET' ? decisionEndpoints : decisionResponse
    );

    const result = await run();

    expect(transportRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({ method: 'GET', path: '/_inference/decision/_all' })
    );
    expect(result.inferenceId).toBe('.jev-1.13-decision');
  });

  it('is unavailable when the cluster lists no decision endpoint', async () => {
    const { run, provider, transportRequest } = setup();

    transportRequest.mockResolvedValue({ endpoints: [] });

    await expect(run()).rejects.toBeInstanceOf(DecisionProviderUnavailableError);
    expect(provider.isAvailable()).toBe(false);
  });

  it('is unavailable when the configured endpoint does not exist', async () => {
    const { run, transportRequest } = setup({ inferenceId: 'missing' });

    transportRequest.mockRejectedValue(responseError(404, 'Inference endpoint not found'));

    await expect(run()).rejects.toBeInstanceOf(DecisionProviderUnavailableError);
  });

  it('is unavailable when Elasticsearch does not know the decision task type', async () => {
    const { run, transportRequest } = setup();

    transportRequest.mockRejectedValue(responseError(400, 'Unknown task_type [decision]'));

    await expect(run()).rejects.toBeInstanceOf(DecisionProviderUnavailableError);
  });

  it('rethrows other errors as retryable failures', async () => {
    const { run, transportRequest } = setup({ inferenceId: 'my-decision' });

    transportRequest.mockRejectedValue(responseError(503, 'overloaded'));

    const error = await run().catch((thrown) => thrown);

    expect(error).toBeInstanceOf(Error);
    expect(isDecisionProviderUnavailableError(error)).toBe(false);
  });

  it('rejects a malformed response', async () => {
    const { run, transportRequest } = setup({ inferenceId: 'my-decision' });

    transportRequest.mockResolvedValue({ decision: { answers: {} } });

    await expect(run()).rejects.toThrow(/question_1/);
  });
});
