/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';
import {
  loggingSystemMock,
  savedObjectsClientMock,
  elasticsearchServiceMock,
} from '@kbn/core/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import type { MockRouter } from '../__mocks__/routes.mock';
import { createMockRouter, routeHandlerContextMock } from '../__mocks__/routes.mock';
import { createRequestMock } from '../__mocks__/request.mock';
import { handleEsError } from '@kbn/es-ui-shared-plugin/server';
import { errors as esErrors } from '@elastic/elasticsearch';
import { ReindexServiceWrapper } from '../lib/reindex_service_wrapper';
import type { Version } from '@kbn/upgrade-assistant-pkg-common';
import { REINDEX_SERVICE_BASE_PATH } from '../../../common';

const mockReindexService = {
  hasRequiredPrivileges: jest.fn(),
  detectReindexWarnings: jest.fn(),
  createReindexOperation: jest.fn(),
  findAllInProgressOperations: jest.fn(),
  findReindexOperation: jest.fn(),
  processNextStep: jest.fn(),
  resumeReindexOperation: jest.fn(),
  cancelReindexing: jest.fn(),
  getIndexAliases: jest.fn().mockResolvedValue({}),
  getIndexInfo: jest.fn().mockResolvedValue({ aliases: {}, settings: {} }),
};

jest.mock('../lib/reindex_service', () => ({
  reindexServiceFactory: () => mockReindexService,
}));

import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import type { ReindexSavedObject } from '../lib/types';
import { credentialStoreFactory } from '../lib/credential_store';
import { registerReindexIndicesRoutes } from './reindex_indices';

const logMock = loggingSystemMock.create().get();

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_migration_apis test.
 */
describe('reindex API', () => {
  let routeDependencies: any;
  let mockRouter: MockRouter;

  const credentialStore = credentialStoreFactory(logMock.get());
  const worker = {
    includes: jest.fn(),
    forceRefresh: jest.fn(),
  } as any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    const securityMockInstance = securityMock.createStart();
    const licensingMockInstance = licensingMock.createStart();
    const version = { getMajorVersion: () => 8, getMinorVersion: () => 7 } as any as Version;
    routeDependencies = {
      credentialStore,
      router: mockRouter,
      licensing: licensingMockInstance,
      lib: { handleEsError },
      getSecurityPlugin: () => Promise.resolve(securityMockInstance),
      getReindexService: async () => {
        return new ReindexServiceWrapper({
          soClient: savedObjectsClientMock.create(),
          credentialStore,
          clusterClient: elasticsearchServiceMock.createClusterClient(),
          logger: logMock,
          licensing: licensingMockInstance,
          security: securityMockInstance,
          version,
          rollupsEnabled: true,
          isServerless: false,
        });
      },
    };
    registerReindexIndicesRoutes(routeDependencies);

    mockReindexService.hasRequiredPrivileges.mockResolvedValue(true);
    mockReindexService.detectReindexWarnings.mockReset();
    mockReindexService.createReindexOperation.mockReset();
    mockReindexService.findAllInProgressOperations.mockReset();
    mockReindexService.findReindexOperation.mockReset();
    mockReindexService.processNextStep.mockReset();
    mockReindexService.resumeReindexOperation.mockReset();
    mockReindexService.cancelReindexing.mockReset();
    worker.includes.mockReset();
    worker.forceRefresh.mockReset();

    // Reset the credentialMap
    credentialStore.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe(`GET ${REINDEX_SERVICE_BASE_PATH}/{indexName}`, () => {
    it('returns the attributes of the reindex operation and reindex warnings', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'wowIndex', status: ReindexStatus.inProgress },
      });
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce([
        {
          warningType: 'indexSetting',
          meta: {
            settingA: 'deprecated',
          },
        },
      ]);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: `${REINDEX_SERVICE_BASE_PATH}/{indexName}`,
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'wowIndex' } }),
        kibanaResponseFactory
      );

      // It called into the service correctly
      expect(mockReindexService.findReindexOperation).toHaveBeenCalledWith('wowIndex');
      expect(mockReindexService.detectReindexWarnings).toHaveBeenCalledWith('wowIndex');

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data.reindexOp).toEqual({ indexName: 'wowIndex', status: ReindexStatus.inProgress });
      expect(data.warnings).toEqual([
        {
          warningType: 'indexSetting',
          meta: {
            settingA: 'deprecated',
          },
        },
      ]);
    });

    it('returns es errors', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce(null);
      mockReindexService.detectReindexWarnings.mockRejectedValueOnce(
        new esErrors.ResponseError({ statusCode: 404 } as any)
      );

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: `${REINDEX_SERVICE_BASE_PATH}/{indexName}`,
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'anIndex' } }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(404);
    });

    it("returns null for both if reindex operation doesn't exist and index doesn't exist", async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce(null);
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce(null);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: `${REINDEX_SERVICE_BASE_PATH}/{indexName}`,
      })(
        routeHandlerContextMock,
        createRequestMock({ params: { indexName: 'anIndex' } }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data.reindexOp).toBeUndefined();
      expect(data.warnings).toBeNull();
    });
  });

  describe(`POST ${REINDEX_SERVICE_BASE_PATH}`, () => {
    it('creates a new reindexOp', async () => {
      mockReindexService.createReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex' },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: REINDEX_SERVICE_BASE_PATH,
      })(
        routeHandlerContextMock,
        createRequestMock({ body: { indexName: 'theIndex', newIndexName: 'theIndexReindexed' } }),
        kibanaResponseFactory
      );

      // It called create correctly
      expect(mockReindexService.createReindexOperation).toHaveBeenCalledWith({
        indexName: 'theIndex',
        newIndexName: 'theIndexReindexed',
        opts: undefined,
        settings: undefined,
      });

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data).toEqual({ indexName: 'theIndex' });
    });

    it('inserts headers into the credentialStore', async () => {
      const reindexOp = {
        attributes: { indexName: 'theIndex' },
      } as ReindexSavedObject;
      mockReindexService.createReindexOperation.mockResolvedValueOnce(reindexOp);

      await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: REINDEX_SERVICE_BASE_PATH,
      })(
        routeHandlerContextMock,
        createRequestMock({
          headers: {
            'kbn-auth-x': 'HERE!',
          },
          body: { indexName: 'theIndex', newIndexName: 'theIndexReindexed' },
        }),
        kibanaResponseFactory
      );

      expect(credentialStore.get(reindexOp)!['kbn-auth-x']).toEqual('HERE!');
    });

    it('resumes a reindexOp if it is paused', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex', status: ReindexStatus.paused },
      });
      mockReindexService.resumeReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex', status: ReindexStatus.inProgress },
      });

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: REINDEX_SERVICE_BASE_PATH,
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: { indexName: 'theIndex', newIndexName: 'theIndexReindexed' },
        }),
        kibanaResponseFactory
      );
      // It called resume correctly
      expect(mockReindexService.resumeReindexOperation).toHaveBeenCalledWith('theIndex', undefined);
      expect(mockReindexService.createReindexOperation).not.toHaveBeenCalled();

      // It returned the right results
      expect(resp.status).toEqual(200);
      const data = resp.payload;
      expect(data).toEqual({ indexName: 'theIndex', status: ReindexStatus.inProgress });
    });

    it('returns a 403 if required privileges fails', async () => {
      mockReindexService.hasRequiredPrivileges.mockResolvedValueOnce(false);

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: REINDEX_SERVICE_BASE_PATH,
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: { indexName: 'theIndex', newIndexName: 'theIndexReindexed' },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(403);
    });
  });

  describe(`POST ${REINDEX_SERVICE_BASE_PATH}/{indexName}/cancel`, () => {
    it('returns a 501', async () => {
      mockReindexService.cancelReindexing.mockResolvedValueOnce({});

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern: `${REINDEX_SERVICE_BASE_PATH}/{indexName}/cancel`,
      })(
        routeHandlerContextMock,
        createRequestMock({
          params: { indexName: 'cancelMe' },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({ acknowledged: true });
      expect(mockReindexService.cancelReindexing).toHaveBeenCalledWith('cancelMe');
    });
  });
});
