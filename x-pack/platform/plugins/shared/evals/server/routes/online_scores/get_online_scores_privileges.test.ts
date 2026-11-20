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
import {
  API_VERSIONS,
  EVALS_ONLINE_SCORES_PRIVILEGES_URL,
  EvaluationIndices,
} from '@kbn/evals-common';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { createEvaluatorRegistry } from '../../evaluators/registry';
import { registerGetOnlineScoresPrivilegesRoute } from './get_online_scores_privileges';

// Mocked-client unit tests: the real Elasticsearch response shape is covered by the
// integration test, which runs against a secured cluster.
describe('GET /internal/evals/online_scores/_privileges', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    registerGetOnlineScoresPrivilegesRoute({
      router,
      logger,
      canEncrypt: false,
      evaluatorRegistry: createEvaluatorRegistry(),
      getInferenceStart: async () => ({ getClient: jest.fn() } as unknown as InferenceServerStart),
      getEncryptedSavedObjectsStart: async () => encryptedSavedObjectsMock.createStart(),
      getInternalRemoteConfigsSoClient: async () => savedObjectsClientMock.create(),
    });
    const { handler } = (router.versioned as MockedVersionedRouter).getRoute(
      'get',
      EVALS_ONLINE_SCORES_PRIVILEGES_URL
    ).versions[API_VERSIONS.internal.v1];

    const coreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: coreContext });
    const { hasPrivileges } = coreContext.elasticsearch.client.asCurrentUser.security;
    return { handler, context, hasPrivileges, logger };
  };

  const request = httpServerMock.createKibanaRequest({
    method: 'get',
    path: EVALS_ONLINE_SCORES_PRIVILEGES_URL,
  });

  it('returns has_read: false for a user without read on the online scores index', async () => {
    const { handler, context, hasPrivileges } = setup();
    hasPrivileges.mockResolvedValueOnce({
      username: 'test-user',
      has_all_requested: false,
      cluster: {},
      application: {},
      index: { [EvaluationIndices.ONLINE_SCORES]: { read: false } },
    });

    const response = await handler(context as any, request, kibanaResponseFactory);

    expect(hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: [EvaluationIndices.ONLINE_SCORES], privileges: ['read'] }],
    });
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ has_read: false });
  });

  it('returns has_read: true for a user with read on the online scores index', async () => {
    const { handler, context, hasPrivileges } = setup();
    hasPrivileges.mockResolvedValueOnce({
      username: 'test-user',
      has_all_requested: true,
      cluster: {},
      application: {},
      index: { [EvaluationIndices.ONLINE_SCORES]: { read: true } },
    });

    const response = await handler(context as any, request, kibanaResponseFactory);

    expect(response.payload).toEqual({ has_read: true });
  });

  it('returns 500 when the privilege check fails', async () => {
    const { handler, context, hasPrivileges, logger } = setup();
    hasPrivileges.mockRejectedValueOnce(new Error('es failure'));

    const response = await handler(context as any, request, kibanaResponseFactory);

    expect(response.status).toBe(500);
    expect(logger.error).toHaveBeenCalled();
  });
});
