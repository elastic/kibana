/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';

import { handleEsError } from '../shared_imports';
import { createMockRouter, MockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

// Need to require to get mock on named export to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ESUpgradeStatusApis = require('../lib/es_deprecations_status');
ESUpgradeStatusApis.getESUpgradeStatus = jest.fn();

import { registerESDeprecationRoutes } from './es_deprecations';

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
    };
    registerESDeprecationRoutes(routeDependencies);
  });

  afterEach(() => {
    jest.resetAllMocks();
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
