/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { createHandler, getAllHandler } from './restore';

describe('[Snapshot and Restore API Routes] Restore', () => {
  const mockRequest = {} as Request;
  const mockResponseToolkit = {} as ResponseToolkit;
  const mockEsShard = {
    type: 'SNAPSHOT',
    source: {},
    target: {},
    index: { size: {}, files: {} },
  };

  describe('createHandler()', () => {
    const mockCreateRequest = ({
      params: {
        repository: 'foo',
        snapshot: 'snapshot-1',
      },
      payload: {},
    } as unknown) as Request;

    it('should return successful response from ES', async () => {
      const mockEsResponse = { acknowledged: true };
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(mockEsResponse);
    });

    it('should throw if ES error', async () => {
      const callWithRequest = jest.fn().mockRejectedValueOnce(new Error());
      await expect(
        createHandler(mockCreateRequest, callWithRequest, mockResponseToolkit)
      ).rejects.toThrow();
    });
  });

  describe('getAllHandler()', () => {
    it('should arrify and filter restore shards returned from ES', async () => {
      const mockEsResponse = {
        fooIndex: {
          shards: [mockEsShard],
        },
        barIndex: {
          shards: [mockEsShard, mockEsShard],
        },
        testIndex: {
          shards: [
            {
              ...mockEsShard,
              type: 'EMPTY_STORE',
            },
          ],
        },
      };
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      const expectedResponse = [
        {
          index: 'fooIndex',
          shards: [{}],
          isComplete: false,
          latestActivityTimeInMillis: 0,
        },
        {
          index: 'barIndex',
          shards: [{}, {}],
          isComplete: false,
          latestActivityTimeInMillis: 0,
        },
      ];
      await expect(
        getAllHandler(mockRequest, callWithRequest, mockResponseToolkit)
      ).resolves.toEqual(expectedResponse);
    });

    it('should return empty array if no repositories returned from ES', async () => {
      const mockEsResponse = {};
      const callWithRequest = jest.fn().mockReturnValueOnce(mockEsResponse);
      const expectedResponse: any[] = [];
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
});
