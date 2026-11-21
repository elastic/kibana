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
import { API_VERSIONS, EVALS_ONLINE_SCORES_NAMES_URL } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistry } from '../../evaluators/registry';
import { registerListOnlineScoreNamesRoute } from './list_online_score_names';

describe('GET /internal/evals/online_scores/_names', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const getSpaceId = jest.fn().mockResolvedValue('space-a');
    registerListOnlineScoreNamesRoute({
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
    const route = versionedRouter.getRoute('get', EVALS_ONLINE_SCORES_NAMES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    const { handler } = route;

    const onlineScoreService = {
      listScoreNames: jest.fn().mockResolvedValue({ names: [] }),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        onlineScoreService,
      } as any,
    });

    return { handler, context, onlineScoreService, logger, getSpaceId, router };
  };

  const makeRequest = (monitorId = 'workflow-1') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_ONLINE_SCORES_NAMES_URL,
      query: { monitor_id: monitorId },
    });

  it('returns every stored score name with its top evaluator from the service', async () => {
    const { handler, context, onlineScoreService, getSpaceId } = setup();
    onlineScoreService.listScoreNames.mockResolvedValueOnce({
      names: [
        { name: 'factuality', evaluatorName: 'correctness' },
        { name: 'tone', evaluatorName: 'style' },
      ],
    });

    const request = makeRequest();
    const response = await handler(context as any, request, kibanaResponseFactory);

    expect(onlineScoreService.listScoreNames).toHaveBeenCalledWith({
      monitorId: 'workflow-1',
      spaceId: 'space-a',
    });
    expect(getSpaceId).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({
      names: [
        { name: 'factuality', evaluatorName: 'correctness' },
        { name: 'tone', evaluatorName: 'style' },
      ],
    });
  });

  it('rejects a query without monitor_id with a 400 validation error', () => {
    const versionedRouter = setup().router.versioned as MockedVersionedRouter;
    const { config } = versionedRouter.getRoute('get', EVALS_ONLINE_SCORES_NAMES_URL).versions[
      API_VERSIONS.internal.v1
    ];
    const validate = (
      config.validate as unknown as {
        request: {
          query: (
            input: unknown,
            factory: {
              ok: (value: unknown) => { value: unknown };
              badRequest: (message: string) => { error: string };
            }
          ) => { value?: unknown; error?: string };
        };
      }
    ).request.query;
    const result = validate({}, { ok: (value) => ({ value }), badRequest: (m) => ({ error: m }) });
    expect(result.value).toBeUndefined();
    expect(result.error).toEqual(expect.any(String));
  });

  it('returns 500 when service throws', async () => {
    const { handler, context, onlineScoreService, logger } = setup();
    onlineScoreService.listScoreNames.mockRejectedValueOnce(new Error('es failure'));

    const response = await handler(context as any, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(response.payload).toEqual({
      message: 'Failed to list online evaluation score names',
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to list online evaluation score names: es failure',
      expect.objectContaining({
        error: expect.objectContaining({ message: 'es failure', stack_trace: expect.any(String) }),
      })
    );
  });
});
