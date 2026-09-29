/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { kibanaResponseFactory } from '@kbn/core/server';

import { handleEsError } from '../shared_imports';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import type { MockRouter } from './__mocks__/routes.mock';
import { createMockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerESDeprecationRoutes } from './es_deprecations';

vi.mock('@kbn/upgrade-assistant-pkg-server', () => {
  const mocked = {
    versionCheckHandlerWrapper: () => (a: any) => a,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../lib/es_deprecations_status', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getESUpgradeStatus: vi.fn(),
}));

const ESUpgradeStatusApis = { getESUpgradeStatus: vi.mocked(getESUpgradeStatus) };

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_deprecations_status test.
 */
describe('ES deprecations API', () => {
  let mockRouter: MockRouter;
  let routeDependencies: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    routeDependencies = {
      config: {
        featureSet: {
          mlSnapshots: true,
          migrateSystemIndices: true,
          reindexCorrectiveActions: true,
        },
      },
      router: mockRouter,
      lib: { handleEsError },
      log: { error: vi.fn() },
      current: { major: 8 },
      cleanupReindexOperations: vi.fn(),
    };
    registerESDeprecationRoutes(routeDependencies);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/upgrade_assistant/es_deprecations', () => {
    it('returns state', async () => {
      ESUpgradeStatusApis.getESUpgradeStatus.mockResolvedValue({
        migrationsDeprecations: [],
        enrichedHealthIndicators: [],
        totalCriticalDeprecations: 0,
        totalCriticalHealthIssues: 0,
      });
      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/es_deprecations',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(JSON.stringify(resp.payload)).toMatchInlineSnapshot(
        `"{\\"migrationsDeprecations\\":[],\\"enrichedHealthIndicators\\":[],\\"totalCriticalDeprecations\\":0,\\"totalCriticalHealthIssues\\":0}"`
      );
    });

    it('returns an 403 error if it throws forbidden', async () => {
      const error = {
        name: 'ResponseError',
        message: `you can't go here!`,
        statusCode: 403,
      };

      ESUpgradeStatusApis.getESUpgradeStatus.mockRejectedValue(error);
      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/es_deprecations',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(403);
    });

    it('returns an 500 error if it throws', async () => {
      ESUpgradeStatusApis.getESUpgradeStatus.mockRejectedValue(new Error('scary error!'));

      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/es_deprecations',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('scary error!');
    });
  });
});
