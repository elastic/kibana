/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request, ResponseToolkit } from 'hapi';
import { registerSnapshotsRoutes, getAllHandler, getOneHandler, deleteHandler } from './snapshots';

const defaultSnapshot = {
  repository: undefined,
  snapshot: undefined,
  uuid: undefined,
  versionId: undefined,
  version: undefined,
  indices: [],
  includeGlobalState: undefined,
  state: undefined,
  startTime: undefined,
  startTimeInMillis: undefined,
  endTime: undefined,
  endTimeInMillis: undefined,
  durationInMillis: undefined,
  indexFailures: [],
  shards: undefined,
};

describe('[Snapshot and Restore API Routes] Snapshots', () => {
  const mockResponseToolkit = {} as ResponseToolkit;
  const mockCallWithInternalUser = jest.fn().mockReturnValue({
    persistent: {
      'cluster.metadata.managed_repository': 'found-snapshots',
    },
  });

  registerSnapshotsRoutes(
    {
      // @ts-ignore
      get: () => {},
      // @ts-ignore
      post: () => {},
      // @ts-ignore
      put: () => {},
      // @ts-ignore
      delete: () => {},
      // @ts-ignore
      patch: () => {},
    },
    {
      elasticsearch: { getCluster: () => ({ callWithInternalUser: mockCallWithInternalUser }) },
    }
  );

  describe('getAllHandler()', () => {
    const mockRequest = {} as Request;

    test('combines snapshots and their repositories returned from ES', async () => {
      const mockSnapshotGetPolicyEsResponse = {
        fooPolicy: {},
      };

      const mockSnapshotGetRepositoryEsResponse = {
        fooRepository: {},
        barRepository: {},
      };

      const mockGetSnapshotsFooResponse = Promise.resolve({
        responses: [
          {
            repository: 'fooRepository',
            snapshots: [{ snapshot: 'snapshot1' }],
          },
        ],
      });

      const mockGetSnapshotsBarResponse = Promise.resolve({
        responses: [
          {
            repository: 'barRepository',
            snapshots: [{ snapshot: 'snapshot2' }],
          },
        ],
      });

      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockSnapshotGetPolicyEsResponse)
        .mockReturnValueOnce(mockSnapshotGetRepositoryEsResponse)
        .mockReturnValueOnce(mockGetSnapshotsFooResponse)
        .mockReturnValueOnce(mockGetSnapshotsBarResponse);

      const expectedResponse = {
        errors: {},
        repositories: ['fooRepository', 'barRepository'],
        policies: ['fooPolicy'],
        snapshots: [
          {
            ...defaultSnapshot,
            repository: 'fooRepository',
            snapshot: 'snapshot1',
            managedRepository: 'found-snapshots',
          },
          {
            ...defaultSnapshot,
            repository: 'barRepository',
            snapshot: 'snapshot2',
            managedRepository: 'found-snapshots',
          },
        ],
      };

      const response = await getAllHandler(mockRequest, callWithRequest, mockResponseToolkit);
      expect(response).toEqual(expectedResponse);
    });

    test('returns empty arrays if no snapshots returned from ES', async () => {
      const mockSnapshotGetPolicyEsResponse = {};
      const mockSnapshotGetRepositoryEsResponse = {};
      const callWithRequest = jest
        .fn()
        .mockReturnValue(mockSnapshotGetPolicyEsResponse)
        .mockReturnValue(mockSnapshotGetRepositoryEsResponse);
      const expectedResponse = {
        errors: [],
        snapshots: [],
        repositories: [],
        policies: [],
      };

      const response = await getAllHandler(mockRequest, callWithRequest, mockResponseToolkit);
      expect(response).toEqual(expectedResponse);
    });

    test('throws if ES error', async () => {
      const callWithRequest = jest.fn().mockImplementation(() => {
        throw new Error();
      });

      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getOneHandler()', () => {
    const repository = 'fooRepository';
    const snapshot = 'snapshot1';

    const mockOneRequest = ({
      params: {
        repository,
        snapshot,
      },
    } as unknown) as Request;

    test('returns snapshot object with repository name if returned from ES', async () => {
      const mockSnapshotGetEsResponse = {
        responses: [
          {
            repository,
            snapshots: [{ snapshot }],
          },
        ],
      };
      const callWithRequest = jest.fn().mockReturnValue(mockSnapshotGetEsResponse);
      const expectedResponse = {
        ...defaultSnapshot,
        snapshot,
        repository,
        managedRepository: 'found-snapshots',
      };

      const response = await getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit);
      expect(response).toEqual(expectedResponse);
    });

    test('throws if ES error', async () => {
      const mockSnapshotGetEsResponse = {
        responses: [
          {
            repository,
            error: {
              root_cause: [
                {
                  type: 'snapshot_missing_exception',
                  reason: `[${repository}:${snapshot}] is missing`,
                },
              ],
              type: 'snapshot_missing_exception',
              reason: `[${repository}:${snapshot}] is missing`,
            },
          },
        ],
      };
      const callWithRequest = jest.fn().mockReturnValue(mockSnapshotGetEsResponse);

      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('deleteHandler()', () => {
    const ids = ['fooRepository/snapshot-1', 'barRepository/snapshot-2'];
    const mockCreateRequest = ({
      params: {
        ids: ids.join(','),
      },
    } as unknown) as Request;

    it('should return successful ES responses', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockResolvedValueOnce(mockEsResponse)
        .mockResolvedValueOnce(mockEsResponse);
      const expectedResponse = {
        itemsDeleted: [
          { snapshot: 'snapshot-1', repository: 'fooRepository' },
          { snapshot: 'snapshot-2', repository: 'barRepository' },
        ],
        errors: [],
      };
      await expect(
        deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return error ES responses', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(mockEsError)
        .mockRejectedValueOnce(mockEsError);
      const expectedResponse = {
        itemsDeleted: [],
        errors: [
          { id: { snapshot: 'snapshot-1', repository: 'fooRepository' }, error: mockEsError },
          { id: { snapshot: 'snapshot-2', repository: 'barRepository' }, error: mockEsError },
        ],
      };
      await expect(
        deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return combination of ES successes and errors', async () => {
      const mockEsError = new Error('Test error') as any;
      mockEsError.response = '{}';
      mockEsError.statusCode = 500;
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockRejectedValueOnce(mockEsError)
        .mockResolvedValueOnce(mockEsResponse);
      const expectedResponse = {
        itemsDeleted: [{ snapshot: 'snapshot-2', repository: 'barRepository' }],
        errors: [
          {
            id: { snapshot: 'snapshot-1', repository: 'fooRepository' },
            error: mockEsError,
          },
        ],
      };
      await expect(
        deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });
  });
});
