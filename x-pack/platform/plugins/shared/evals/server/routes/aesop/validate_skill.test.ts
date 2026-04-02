/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory, SavedObjectsErrorHelpers } from '@kbn/core/server';
import { coreMock, httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { MockedVersionedRouter } from '@kbn/core-http-router-server-mocks';
import { API_VERSIONS, EVALS_INTERNAL_URL } from '@kbn/evals-common';
import { EvaluatorRegistry } from '../../lib/evaluation_engine';
import { SkillValidationService } from '../../lib/aesop';
import { registerValidateSkillRoute } from './validate_skill';

const EVALS_SKILL_VALIDATE_URL = `${EVALS_INTERNAL_URL}/skills/{skillId}/validate`;

describe('POST /internal/evals/skills/{skillId}/validate', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const evaluatorRegistry = new EvaluatorRegistry(logger);
    const skillValidationService = new SkillValidationService(evaluatorRegistry, logger);

    registerValidateSkillRoute({ router, logger, evaluatorRegistry, skillValidationService });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('post', EVALS_SKILL_VALIDATE_URL).versions[
      API_VERSIONS.internal.v1
    ];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });

    return { handler, context, logger, evaluatorRegistry, skillValidationService, mockCoreContext };
  };

  it('returns 404 when skill is not found', async () => {
    const { handler, context, mockCoreContext } = setup();

    mockCoreContext.savedObjects.client.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('evals-proposed-skill', 'missing')
    );

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_SKILL_VALIDATE_URL,
      params: { skillId: 'missing' },
      body: { connector_id: 'conn-1' },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(404);
  });

  it('returns 500 on unexpected error', async () => {
    const { handler, context, mockCoreContext } = setup();

    mockCoreContext.savedObjects.client.get.mockRejectedValue(new Error('DB crash'));

    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: EVALS_SKILL_VALIDATE_URL,
      params: { skillId: 'test-skill' },
      body: { connector_id: 'conn-1' },
    });

    const response = await handler(context, request, kibanaResponseFactory);

    expect(response.status).toBe(500);
  });
});
