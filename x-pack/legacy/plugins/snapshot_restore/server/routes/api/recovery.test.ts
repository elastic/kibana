/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Request, ResponseToolkit } from 'hapi';
import { getAllHandler } from './recovery';

describe('[Snapshot and Restore API Routes] Recovery', () => {
  const mockRequest = {} as Request;
  const mockResponseToolkit = {} as ResponseToolkit;
  const mockEsShard = {
    type: 'SNAPSHOT',
    source: {},
    target: {},
    index: { size: {}, files: {} },
    translog: {},
  };

  describe('getAllHandler()', () => {
    it('should arrify and filter recovery shards returned from ES', async () => {
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
        { index: 'fooIndex', shards: [{}] },
        { index: 'barIndex', shards: [{}, {}] },
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
