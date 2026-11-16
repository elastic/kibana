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
import { EVALS_BASELINE_SCORES_URL, API_VERSIONS } from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistryMock } from '../../evaluators/registry.mock';
import { registerGetPinnedBaselineScoresRoute } from './get_pinned_baseline_scores';

describe('GET /internal/evals/baselines/{baselineId}/scores', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetPinnedBaselineScoresRoute({
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
    const { handler } = versionedRouter.getRoute('get', EVALS_BASELINE_SCORES_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const pinnedBaselineService = {
      getScores: jest.fn().mockResolvedValue([]),
    };
    const context = coreMock.createCustomRequestHandlerContext({
      evals: {
        pinnedBaselineService,
      } as any,
    });

    return { handler, context, pinnedBaselineService, logger };
  };

  const makeRequest = (baselineId = 'baseline-1') =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: EVALS_BASELINE_SCORES_URL.replace('{baselineId}', baselineId),
      params: { baselineId },
    });

  it('returns the snapshot scores for the baseline in the current Space', async () => {
    const { handler, context, pinnedBaselineService } = setup();
    const score = { experiment_id: 'exp-1', evaluator: { name: 'correctness', score: 0.9 } };
    pinnedBaselineService.getScores.mockResolvedValueOnce([score, score]);

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(200);
    expect(response.payload.scores).toHaveLength(2);
    expect(response.payload.total).toBe(2);
    expect(pinnedBaselineService.getScores).toHaveBeenCalledWith({
      baselineId: 'baseline-1',
      spaceId: 'space-a',
    });
  });

  it('returns 500 when the lookup fails', async () => {
    const { handler, context, pinnedBaselineService, logger } = setup();
    pinnedBaselineService.getScores.mockRejectedValueOnce(new Error('ES down'));

    const response = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
