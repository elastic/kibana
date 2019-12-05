/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { kibanaResponseFactory } from 'src/core/server';
import { createMockRouter, MockRouter } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';

jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

// Need to require to get mock on named export to work.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const MigrationApis = require('../lib/es_migration_apis');
MigrationApis.getUpgradeAssistantStatus = jest.fn();

import { registerClusterCheckupRoutes } from './cluster_checkup';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_migration_apis test.
 */
describe('cluster checkup API', () => {
  afterEach(() => jest.clearAllMocks());

  let mockRouter: MockRouter;
  let serverShim: any;
  let ctxMock: any;
  let mockPluginsSetup: any;

  beforeEach(() => {
    mockRouter = createMockRouter();
    mockPluginsSetup = {
      cloud: {
        isCloudEnabled: true,
      },
    };
    ctxMock = {
      core: {},
    };
    serverShim = {
      router: mockRouter,
      plugins: {
        apm_oss: {
          indexPatterns: ['apm-*'],
        },
        elasticsearch: {
          getCluster: () => ({ callWithRequest: jest.fn() } as any),
        } as any,
      },
    };
    registerClusterCheckupRoutes(serverShim, mockPluginsSetup);
  });

  describe('with cloud enabled', () => {
    it('is provided to getUpgradeAssistantStatus', async () => {
      const spy = jest.spyOn(MigrationApis, 'getUpgradeAssistantStatus');

      MigrationApis.getUpgradeAssistantStatus.mockResolvedValue({
        cluster: [],
        indices: [],
        nodes: [],
      });

      await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);
      expect(spy.mock.calls[0][2]).toBe(true);
    });
  });

  describe('with APM enabled', () => {
    it('is provided to getUpgradeAssistantStatus', async () => {
      const spy = jest.spyOn(MigrationApis, 'getUpgradeAssistantStatus');
      await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);

      MigrationApis.getUpgradeAssistantStatus.mockResolvedValue({
        cluster: [],
        indices: [],
        nodes: [],
      });

      expect(spy.mock.calls[0][3]).toEqual(['apm-*']);
    });
  });

  describe('GET /api/upgrade_assistant/reindex/{indexName}.json', () => {
    it('returns state', async () => {
      MigrationApis.getUpgradeAssistantStatus.mockResolvedValue({
        cluster: [],
        indices: [],
        nodes: [],
      });
      const resp = await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(JSON.stringify(resp.payload)).toMatchInlineSnapshot(
        `"{\\"cluster\\":[],\\"indices\\":[],\\"nodes\\":[]}"`
      );
    });

    it('returns an 403 error if it throws forbidden', async () => {
      const e: any = new Error(`you can't go here!`);
      e.status = 403;

      MigrationApis.getUpgradeAssistantStatus.mockRejectedValue(e);
      const resp = await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(403);
    });

    it('returns an 500 error if it throws', async () => {
      MigrationApis.getUpgradeAssistantStatus.mockRejectedValue(new Error(`scary error!`));

      const resp = await serverShim.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(ctxMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(500);
    });
  });
});
