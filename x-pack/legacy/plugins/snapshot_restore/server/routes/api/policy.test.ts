/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { getAllHandler, getOneHandler, deleteHandler } from './policy';

describe('[Snapshot and Restore API Routes] Restore', () => {
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
    nextExecutionMillis: 1562722200000,
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
});
