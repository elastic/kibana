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
import { EVALS_BASELINES_LATEST_URL, API_VERSIONS } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { registerGetLatestPinnedBaselineRoute } from './get_latest_pinned_baseline';

describe('GET /internal/evals/baselines/latest', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetLatestPinnedBaselineRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistryMock(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
      getSpaceId: async () => 'space-a',
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', EVALS_BASELINES_LATEST_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const pinnedBaselineService = {
      findLatest: jest.fn().mockResolvedValue(undefined),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        pinnedBaselineService,
      } as any,
    });

    return { handler, context, pinnedBaselineService, logger };
  };

  const makeRequest = (query: Record<string, string> = { suite_id: 'suite-1' }) =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_BASELINES_LATEST_URL,
      query,
    });

  it('resolves the latest pin for the suite, model and Space', async () => {
    const { handler, context, pinnedBaselineService } = setup();
    const baseline = { baseline_id: 'baseline-1', suite_id: 'suite-1' };
    pinnedBaselineService.findLatest.mockResolvedValueOnce(baseline);

    const response = await handler(
      context,
      makeRequest({ suite_id: 'suite-1', model_id: 'gpt-5' }),
      kibanaResponseFactory
    );

    expect(response.status).toBe(200);
    expect(response.payload.baseline).toEqual(baseline);
    expect(pinnedBaselineService.findLatest).toHaveBeenCalledWith({
      suiteId: 'suite-1',
      modelId: 'gpt-5',
      spaceId: 'space-a',
    });
  });

  it('returns a null baseline when nothing is pinned', async () => {
    const { handler, context } = setup();

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.baseline).toBeNull();
  });

  it('returns 500 when the lookup fails', async () => {
    const { handler, context, pinnedBaselineService, logger } = setup();
    pinnedBaselineService.findLatest.mockRejectedValueOnce(new Error('ES down'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
