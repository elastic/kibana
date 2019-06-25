/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';

const mockReindexService = {
  hasRequiredPrivileges: jest.fn(),
  detectReindexWarnings: jest.fn(),
  getIndexGroup: jest.fn(),
  createReindexOperation: jest.fn(),
  findAllInProgressOperations: jest.fn(),
  findReindexOperation: jest.fn(),
  processNextStep: jest.fn(),
  resumeReindexOperation: jest.fn(),
  cancelReindexing: jest.fn(),
};

jest.mock('../lib/es_version_precheck');
jest.mock('../lib/reindexing', () => {
  return {
    reindexServiceFactory: () => mockReindexService,
  };
});

import { IndexGroup, ReindexSavedObject, ReindexStatus, ReindexWarning } from '../../common/types';
import { credentialStoreFactory } from '../lib/reindexing/credential_store';
import { registerReindexIndicesRoutes } from './reindex_indices';

/**
 * Since these route callbacks are so thin, these serve simply as integration tests
 * to ensure they're wired up to the lib functions correctly. Business logic is tested
 * more thoroughly in the es_migration_apis test.
 */
describe('reindex API', () => {
  const server = new Server();
  server.plugins = {
    elasticsearch: {
      getCluster: () => ({ callWithRequest: jest.fn() } as any),
    } as any,
    xpack_main: {
      info: {},
    },
  } as any;
  server.config = () => ({ get: () => '' } as any);
  server.decorate('request', 'getSavedObjectsClient', () => jest.fn());

  const credentialStore = credentialStoreFactory();

  const worker = {
    includes: jest.fn(),
    forceRefresh: jest.fn(),
  } as any;

  registerReindexIndicesRoutes(server, worker, credentialStore);

  beforeEach(() => {
    mockReindexService.hasRequiredPrivileges.mockResolvedValue(true);
    mockReindexService.detectReindexWarnings.mockReset();
    mockReindexService.getIndexGroup.mockReset();
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

  describe('GET /api/upgrade_assistant/reindex/{indexName}', () => {
    it('returns the attributes of the reindex operation and reindex warnings', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'wowIndex', status: ReindexStatus.inProgress },
      });
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce([ReindexWarning.allField]);

      const resp = await server.inject({
        method: 'GET',
        url: `/api/upgrade_assistant/reindex/wowIndex`,
      });

      // It called into the service correctly
      expect(mockReindexService.findReindexOperation).toHaveBeenCalledWith('wowIndex');
      expect(mockReindexService.detectReindexWarnings).toHaveBeenCalledWith('wowIndex');

      // It returned the right results
      expect(resp.statusCode).toEqual(200);
      const data = JSON.parse(resp.payload);
      expect(data.reindexOp).toEqual({ indexName: 'wowIndex', status: ReindexStatus.inProgress });
      expect(data.warnings).toEqual([0]);
    });

    it("returns null for both if reindex operation doesn't exist and index doesn't exist", async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce(null);
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce(null);

      const resp = await server.inject({
        method: 'GET',
        url: `/api/upgrade_assistant/reindex/anIndex`,
      });

      expect(resp.statusCode).toEqual(200);
      const data = JSON.parse(resp.payload);
      expect(data.reindexOp).toBeNull();
      expect(data.warnings).toBeNull();
    });

    it('returns the indexGroup for ML indices', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce(null);
      mockReindexService.detectReindexWarnings.mockResolvedValueOnce([]);
      mockReindexService.getIndexGroup.mockReturnValue(IndexGroup.ml);

      const resp = await server.inject({
        method: 'GET',
        url: `/api/upgrade_assistant/reindex/.ml-state`,
      });

      expect(resp.statusCode).toEqual(200);
      const data = JSON.parse(resp.payload);
      expect(data.indexGroup).toEqual(IndexGroup.ml);
    });
  });

  describe('POST /api/upgrade_assistant/reindex/{indexName}', () => {
    it('creates a new reindexOp', async () => {
      mockReindexService.createReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex' },
      });

      const resp = await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/reindex/theIndex',
      });

      // It called create correctly
      expect(mockReindexService.createReindexOperation).toHaveBeenCalledWith('theIndex');

      // It returned the right results
      expect(resp.statusCode).toEqual(200);
      const data = JSON.parse(resp.payload);
      expect(data).toEqual({ indexName: 'theIndex' });
    });

    it('calls worker.forceRefresh', async () => {
      mockReindexService.createReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex' },
      });

      await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/reindex/theIndex',
      });

      expect(worker.forceRefresh).toHaveBeenCalled();
    });

    it('inserts headers into the credentialStore', async () => {
      const reindexOp = {
        attributes: { indexName: 'theIndex' },
      } as ReindexSavedObject;
      mockReindexService.createReindexOperation.mockResolvedValueOnce(reindexOp);

      await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/reindex/theIndex',
        headers: {
          'kbn-auth-x': 'HERE!',
        },
      });

      expect(credentialStore.get(reindexOp)!['kbn-auth-x']).toEqual('HERE!');
    });

    it('resumes a reindexOp if it is paused', async () => {
      mockReindexService.findReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex', status: ReindexStatus.paused },
      });
      mockReindexService.resumeReindexOperation.mockResolvedValueOnce({
        attributes: { indexName: 'theIndex', status: ReindexStatus.inProgress },
      });

      const resp = await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/reindex/theIndex',
      });

      // It called resume correctly
      expect(mockReindexService.resumeReindexOperation).toHaveBeenCalledWith('theIndex');
      expect(mockReindexService.createReindexOperation).not.toHaveBeenCalled();

      // It returned the right results
      expect(resp.statusCode).toEqual(200);
      const data = JSON.parse(resp.payload);
      expect(data).toEqual({ indexName: 'theIndex', status: ReindexStatus.inProgress });
    });

    it('returns a 403 if required privileges fails', async () => {
      mockReindexService.hasRequiredPrivileges.mockResolvedValueOnce(false);

      const resp = await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/reindex/theIndex',
      });

      expect(resp.statusCode).toEqual(403);
    });
  });

  describe('POST /api/upgrade_assistant/reindex/{indexName}/cancel', () => {
    it('returns a 501', async () => {
      mockReindexService.cancelReindexing.mockResolvedValueOnce({});

      const resp = await server.inject({
        method: 'POST',
        url: '/api/upgrade_assistant/reindex/cancelMe/cancel',
      });

      expect(resp.statusCode).toEqual(200);
      expect(resp.payload).toMatchInlineSnapshot(`"{\\"acknowledged\\":true}"`);
      expect(mockReindexService.cancelReindexing).toHaveBeenCalledWith('cancelMe');
    });
  });
});
