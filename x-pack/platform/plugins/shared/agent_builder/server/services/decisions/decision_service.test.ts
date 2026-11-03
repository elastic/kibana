/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { DecisionQuestion } from '@kbn/agent-builder-server';
import decisionResponse from './__fixtures__/decision_response.json';
import decisionEndpoints from './__fixtures__/decision_endpoints.json';
import { createDecisionService } from './decision_service';

const questions: Record<string, DecisionQuestion> = {
  should_respond: { type: 'predicate', instructions: 'Should the agent respond?' },
};

const input = 'secret conversation text';

const setup = ({ inferenceId }: { inferenceId?: string } = {}) => {
  const logger = loggingSystemMock.createLogger();
  const elasticsearch = elasticsearchServiceMock.createStart();
  const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
  const request = httpServerMock.createKibanaRequest();

  elasticsearch.client.asScoped.mockReturnValue(scopedClient);

  const transportRequest = scopedClient.asCurrentUser.transport.request;

  const service = createDecisionService({
    logger,
    elasticsearch,
    config: { inferenceId, triggerThreshold: 0.5, timeoutMs: 2000 },
  });

  return { service, logger, transportRequest, scopedClient, request };
};

const isGet = ({ method }: { method: string }) => method === 'GET';

describe('createDecisionService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('uses config.inferenceId without listing endpoints', async () => {
    const { service, transportRequest, request } = setup({ inferenceId: 'my-decision' });

    transportRequest.mockResolvedValue(decisionResponse);

    await service.decide({ request, input, questions });

    expect(transportRequest).toHaveBeenCalledTimes(1);
    expect(transportRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        path: '/_inference/decision/my-decision',
        body: { input, task_settings: { questions } },
      })
    );
  });

  it('discovers the first decision endpoint when none is configured', async () => {
    const { service, transportRequest, request } = setup();

    transportRequest.mockImplementation(async (params) =>
      isGet(params) ? decisionEndpoints : decisionResponse
    );

    const result = await service.decide({ request, input, questions });

    expect(transportRequest.mock.calls[0][0]).toEqual(
      expect.objectContaining({ method: 'GET', path: '/_inference/decision' })
    );
    expect(transportRequest.mock.calls[1][0]).toEqual(
      expect.objectContaining({ method: 'POST', path: '/_inference/decision/.jev-1.13-decision' })
    );
    expect(result).toEqual(expect.objectContaining({ inferenceId: '.jev-1.13-decision' }));
  });

  it('returns unavailable when no decision endpoint exists', async () => {
    const { service, transportRequest, request } = setup();

    transportRequest.mockResolvedValue({ endpoints: [] });

    const result = await service.decide({ request, input, questions });

    expect(result).toEqual({ status: 'unavailable' });
    expect(transportRequest).toHaveBeenCalledTimes(1);
  });

  it('returns failed when ES errors', async () => {
    const { service, transportRequest, request } = setup({ inferenceId: 'my-decision' });
    const error = new Error('boom');

    transportRequest.mockRejectedValue(error);

    const result = await service.decide({ request, input, questions });

    expect(result).toEqual({ status: 'failed', error });
  });

  it('returns failed on timeout', async () => {
    jest.useFakeTimers();

    const { service, transportRequest, request } = setup({ inferenceId: 'my-decision' });

    transportRequest.mockReturnValue(new Promise(() => {}));

    const pending = service.decide({ request, input, questions, timeoutMs: 50 });

    await jest.advanceTimersByTimeAsync(50);

    const result = await pending;

    expect(result.status).toBe('failed');
  });

  it('returns failed on a malformed response', async () => {
    const { service, transportRequest, request } = setup({ inferenceId: 'my-decision' });

    transportRequest.mockResolvedValue({ decision: { answers: {} } });

    const result = await service.decide({ request, input, questions });

    expect(result.status).toBe('failed');
  });

  it('returns decided with parsed answers and inferenceId', async () => {
    const { service, transportRequest, request, scopedClient } = setup({
      inferenceId: 'my-decision',
    });

    transportRequest.mockResolvedValue(decisionResponse);

    const result = await service.decide({ request, input, questions });

    expect(result).toEqual({
      status: 'decided',
      inferenceId: 'my-decision',
      answers: { should_respond: { type: 'predicate', probability: 0.94 } },
    });
    expect(scopedClient.asInternalUser.transport.request).not.toHaveBeenCalled();
  });

  it('does not log the input text', async () => {
    const { service, transportRequest, request, logger } = setup({ inferenceId: 'my-decision' });

    transportRequest.mockResolvedValue(decisionResponse);

    await service.decide({ request, input, questions });

    const logged = JSON.stringify([
      ...logger.debug.mock.calls,
      ...logger.info.mock.calls,
      ...logger.warn.mock.calls,
      ...logger.error.mock.calls,
    ]);

    expect(logged).not.toContain(input);
  });
});
