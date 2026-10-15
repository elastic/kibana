/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { API_VERSIONS, EVALS_ONLINE_SCORES_URL } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistry } from '../../evaluators/registry';
import { registerListOnlineScoresRoute } from './list_online_scores';

describe('GET /internal/evals/online_scores', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const getSpaceId = jest.fn().mockResolvedValue('space-a');
    registerListOnlineScoresRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const route = versionedRouter.getRoute('get', EVALS_ONLINE_SCORES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    const { handler } = route;

    const onlineScoreService = {
      list: jest.fn().mockResolvedValue({ total: 0, data: [] }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        onlineScoreService,
      } as any,
    });

    return { handler, context, onlineScoreService, logger, getSpaceId };
  };

  const makeRequest = ({
    monitorId = 'workflow-1',
    page = 2,
    perPage = 25,
  }: {
    monitorId?: string;
    page?: number;
    perPage?: number;
  } = {}) =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_ONLINE_SCORES_URL,
      query: {
        monitor_id: monitorId,
        page,
        per_page: perPage,
      },
    });

  it('returns online scores list from service', async () => {
    const { handler, context, onlineScoreService, getSpaceId } = setup();
    onlineScoreService.list.mockResolvedValueOnce({
      total: 1,
      data: [
        {
          '@timestamp': '2026-07-03T12:00:00.000Z',
          monitor: { id: 'workflow-1', name: 'Online Eval Workflow' },
          trace_id: 'trace-1',
          evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
          score: { name: 'factuality', value: 0.9, label: 'pass' },
        },
      ],
    });

    const request = makeRequest();
    const response = await handler(context as any, request, kibanaResponseFactory);

    expect(onlineScoreService.list).toHaveBeenCalledWith({
      monitorId: 'workflow-1',
      spaceId: 'space-a',
      page: 2,
      perPage: 25,
    });
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      total: 1,
      data: [
        {
          '@timestamp': '2026-07-03T12:00:00.000Z',
          monitor: { id: 'workflow-1', name: 'Online Eval Workflow' },
          trace_id: 'trace-1',
          evaluator: { name: 'correctness', version: '1.0.0', kind: 'llm' },
          score: { name: 'factuality', value: 0.9, label: 'pass' },
        },
      ],
    });
  });

  it('returns 500 when service throws', async () => {
    const { handler, context, onlineScoreService, logger } = setup();
    onlineScoreService.list.mockRejectedValueOnce(new Error('es failure'));

    const response = await handler(context as any, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({ message: 'Failed to list online evaluation scores' });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to list online evaluation scores: es failure',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'es failure', stack_trace: expect.any(String) }),
      })
    );
  });
});
