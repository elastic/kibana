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
import { API_VERSIONS } from '@kbn/evals-common';
import { z } from '@kbn/zod';
import { ExperimentSuiteRegistry } from '../../experiments/registry';
import { registerGetExperimentSuitesRoute } from './get_suites';

describe('GET /internal/evals/experiments/suites', () => {
  const setup = () => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const experimentSuiteRegistry = new ExperimentSuiteRegistry();
    experimentSuiteRegistry.register({
      id: 'suite-1',
      name: 'Suite 1',
      description: 'desc',
      inputSchema: z.object({}),
      run: async () => undefined,
    });

    registerGetExperimentSuitesRoute({
      router,
      logger,
      experimentSuiteRegistry,
      canEncrypt: true,
      getEncryptedSavedObjectsStart: jest.fn(),
      getInternalRemoteConfigsSoClient: jest.fn(),
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', '/internal/evals/experiments/suites')
      .versions[API_VERSIONS.internal.v1];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });

    return { handler, context };
  };

  it('returns registry suites', async () => {
    const { handler, context } = setup();

    const request = httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/internal/evals/experiments/suites',
    });

    const res = await handler(context, request, kibanaResponseFactory);

    expect(res.status).toBe(200);
    expect(res.payload).toEqual({
      suites: [{ id: 'suite-1', name: 'Suite 1', description: 'desc', tags: undefined }],
    });
  });
});
