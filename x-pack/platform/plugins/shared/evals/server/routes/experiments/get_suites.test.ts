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
import type { RouteDependencies } from '../register_routes';

describe('GET /internal/evals/experiments/suites', () => {
  const setup = (
    overrides: Partial<Pick<RouteDependencies, 'workflowsManagement' | 'workflowsExtensions'>> = {},
    {
      defaultRepetitions,
    }: {
      defaultRepetitions?: number;
    } = {}
  ) => {
    const router = httpServiceMock.createRouter();
    const logger = loggingSystemMock.createLogger();
    const experimentSuiteRegistry = new ExperimentSuiteRegistry();
    experimentSuiteRegistry.register({
      id: 'suite-1',
      name: 'Suite 1',
      description: 'desc',
      inputSchema: z.object({}),
      run: async () => undefined,
      ...(defaultRepetitions !== undefined ? { defaultRepetitions } : {}),
    });

    registerGetExperimentSuitesRoute({
      router,
      logger,
      experimentSuiteRegistry,
      canEncrypt: true,
      getEncryptedSavedObjectsStart: jest.fn(),
      getInternalRemoteConfigsSoClient: jest.fn(),
      ...overrides,
    });

    const versionedRouter = router.versioned as MockedVersionedRouter;
    const { handler } = versionedRouter.getRoute('get', '/internal/evals/experiments/suites')
      .versions[API_VERSIONS.internal.v1];

    const mockCoreContext = coreMock.createRequestHandlerContext();
    const context = coreMock.createCustomRequestHandlerContext({ core: mockCoreContext });

    return { handler, context };
  };

  const makeRequest = () =>
    httpServerMock.createKibanaRequest({
      method: 'get',
      path: '/internal/evals/experiments/suites',
    });

  it('returns suites and reports available=false when both Workflows plugins are missing', async () => {
    const { handler, context } = setup();

    const res = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(res.status).toBe(200);
    expect(res.payload).toEqual({
      suites: [
        {
          id: 'suite-1',
          name: 'Suite 1',
          description: 'desc',
          tags: undefined,
          default_repetitions: undefined,
        },
      ],
      available: false,
      unavailable_reason: expect.stringContaining('workflowsExtensions'),
      missing_plugins: ['workflowsExtensions', 'workflowsManagement'],
    });
  });

  it('reports available=false with a single missing plugin', async () => {
    const { handler, context } = setup({
      workflowsExtensions: {} as RouteDependencies['workflowsExtensions'],
    });

    const res = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(res.status).toBe(200);
    expect(res.payload).toMatchObject({
      available: false,
      missing_plugins: ['workflowsManagement'],
    });
  });

  it('reports available=true when both Workflows plugins are wired', async () => {
    const { handler, context } = setup({
      workflowsManagement: {} as RouteDependencies['workflowsManagement'],
      workflowsExtensions: {} as RouteDependencies['workflowsExtensions'],
    });

    const res = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(res.status).toBe(200);
    expect(res.payload).toEqual({
      suites: [
        {
          id: 'suite-1',
          name: 'Suite 1',
          description: 'desc',
          tags: undefined,
          default_repetitions: undefined,
        },
      ],
      available: true,
    });
    expect(res.payload).not.toHaveProperty('missing_plugins');
    expect(res.payload).not.toHaveProperty('unavailable_reason');
  });

  it('surfaces suite-level defaultRepetitions as default_repetitions in the list item', async () => {
    const { handler, context } = setup(
      {
        workflowsManagement: {} as RouteDependencies['workflowsManagement'],
        workflowsExtensions: {} as RouteDependencies['workflowsExtensions'],
      },
      { defaultRepetitions: 5 }
    );

    const res = await handler(context, makeRequest(), kibanaResponseFactory);

    expect(res.status).toBe(200);
    expect(res.payload).toEqual({
      suites: [
        {
          id: 'suite-1',
          name: 'Suite 1',
          description: 'desc',
          tags: undefined,
          default_repetitions: 5,
        },
      ],
      available: true,
    });
  });
});
