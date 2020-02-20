/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import {
  getAllHandler,
  getOneHandler,
  executeHandler,
  deleteHandler,
  createHandler,
  updateHandler,
  getIndicesHandler,
  updateRetentionSettingsHandler,
} from './policy';

describe('[Snapshot and Restore API Routes] Policy', () => {
  const mockRequest = {} as Request;
  const mockResponseToolkit = {} as ResponseToolkit;
  const mockEsPolicy = {
    version: 1,
    modified_date_millis: 1562710315761,
    policy: {
      name: '<daily-snap-{now/d}>',
      schedule: '0 30 1 * * ?',
      repository: 'my-backups',
      config: {},
      retention: {
        expire_after: '15d',
        min_count: 5,
        max_count: 10,
      },
    },
    next_execution_millis: 1562722200000,
  };
  const mockPolicy = {
    version: 1,
    modifiedDateMillis: 1562710315761,
    snapshotName: '<daily-snap-{now/d}>',
    schedule: '0 30 1 * * ?',
    repository: 'my-backups',
    config: {},
    retention: {
      expireAfterValue: 15,
      expireAfterUnit: 'd',
      minCount: 5,
      maxCount: 10,
    },
    nextExecutionMillis: 1562722200000,
    isManagedPolicy: false,
  };

  describe('getAllHandler()', () => {
    it('should arrify policies returned from ES', async () => {
      const mockEsResponse = {
        fooPolicy: mockEsPolicy,
        barPolicy: mockEsPolicy,
      };
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      const expectedResponse = {
        policies: [
          {
            name: 'fooPolicy',
            ...mockPolicy,
          },
          {
            name: 'barPolicy',
            ...mockPolicy,
          },
        ],
      };
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { policies: [] };
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getOneHandler()', () => {
    const name = 'fooPolicy';
    const mockOneRequest = ({
      params: {
        name,
      },
    } as unknown) as Request;

    it('should return policy if returned from ES', async () => {
      const mockEsResponse = {
        [name]: mockEsPolicy,
      };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({});
      const expectedResponse = {
        policy: {
          name,
          ...mockPolicy,
        },
      };
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return 404 error if not returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce(mockEsResponse)
        .mockResolvedValueOnce({});
      await expect(
        getOneHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getOneHandler(mockOneRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('executeHandler()', () => {
    const name = 'fooPolicy';
    const mockExecuteRequest = ({
      params: {
        name,
      },
    } as unknown) as Request;

    it('should return snapshot name from ES', async () => {
      const mockEsResponse = {
        snapshot_name: 'foo-policy-snapshot',
      };
      const callWithRequest = jest.fn().mockResolvedValueOnce(mockEsResponse);
      const expectedResponse = {
        snapshotName: 'foo-policy-snapshot',
      };
      await expect(
        executeHandler(mockExecuteRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        executeHandler(mockExecuteRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('deleteHandler()', () => {
    const names = ['fooPolicy', 'barPolicy'];
    const mockCreateRequest = ({
      params: {
        names: names.join(','),
      },
    } as unknown) as Request;

    it('should return successful ES responses', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockResolvedValueOnce(mockEsResponse)
        .mockResolvedValueOnce(mockEsResponse);
      const expectedResponse = { itemsDeleted: names, errors: [] };
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
        errors: names.map(name => ({
          name,
          error: mockEsError,
        })),
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
        itemsDeleted: [names[1]],
        errors: [
          {
            name: names[0],
            error: mockEsError,
          },
        ],
      };
      await expect(
        deleteHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });
  });

  describe('createHandler()', () => {
    const name = 'fooPolicy';
    const mockCreateRequest = ({
      payload: {
        name,
      },
    } as unknown) as Request;

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({})
        .mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { ...mockEsResponse };
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return error if policy with the same name already exists', async () => {
      const mockEsResponse = { [name]: {} };
      const callWithRequest = jest.fn().mockReturnValue(mockEsResponse);
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({})
        .mockRejectedValueOnce(new Error());
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('updateHandler()', () => {
    const name = 'fooPolicy';
    const mockCreateRequest = ({
      params: {
        name,
      },
      payload: {
        name,
      },
    } as unknown) as Request;

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest
        .fn()
        .mockReturnValueOnce({ [name]: {} })
        .mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { ...mockEsResponse };
      await expect(
        updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        updateHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getIndicesHandler()', () => {
    it('should arrify and sort index names returned from ES', async () => {
      const mockEsResponse = [
        {
          index: 'fooIndex',
        },
        {
          index: 'barIndex',
        },
      ];
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      const expectedResponse = {
        indices: ['barIndex', 'fooIndex'],
      };
      await expect(
        getIndicesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty array if no indices returned from ES', async () => {
      const mockEsResponse: any[] = [];
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { indices: [] };
      await expect(
        getIndicesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        getIndicesHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('updateRetentionSettingsHandler()', () => {
    const retentionSettings = {
      retentionSchedule: '0 30 1 * * ?',
    };
    const mockCreateRequest = ({
      payload: retentionSettings,
    } as unknown) as Request;

    it('should return successful ES response', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      const expectedResponse = { ...mockEsResponse };
      await expect(
        updateRetentionSettingsHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        updateRetentionSettingsHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });
});
