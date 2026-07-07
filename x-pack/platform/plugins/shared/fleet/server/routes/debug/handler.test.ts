/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { OUTPUT_SAVED_OBJECT_TYPE } from '../../constants';

import {
  fetchIndexHandler,
  fetchSavedObjectNamesHandler,
  fetchSavedObjectsHandler,
} from './handler';

describe('Fleet debug handlers', () => {
  const createMockResponse = () => ({
    ok: jest.fn().mockImplementation((opts: { body?: unknown }) => ({ ...opts, statusCode: 200 })),
    badRequest: jest.fn().mockImplementation((opts: { body?: { message?: string } }) => ({
      ...opts,
      statusCode: 400,
    })),
  });

  describe('fetchIndexHandler', () => {
    it('returns 400 when index is not allowed for debug', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const context = {
        core: Promise.resolve({
          elasticsearch: { client: { asInternalUser: esClient } },
        }),
        fleet: Promise.resolve({ internalSoClient: savedObjectsClientMock.create() }),
      } as any;
      const response = createMockResponse();

      const result = await fetchIndexHandler(
        context,
        { body: { index: 'other-index' } } as any,
        response as any
      );

      expect(result).toEqual({
        body: { message: 'Index not allowed for debug.' },
        statusCode: 400,
      });
      expect(esClient.search).not.toHaveBeenCalled();
    });

    it('returns 200 and calls fetchIndex when index is allowed', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const searchResult = { hits: { hits: [] }, took: 0, _shards: {} };
      esClient.search.mockResolvedValue(searchResult as any);

      const context = {
        core: Promise.resolve({
          elasticsearch: { client: { asInternalUser: esClient } },
        }),
        fleet: Promise.resolve({ internalSoClient: savedObjectsClientMock.create() }),
      } as any;
      const response = createMockResponse();

      const result = await fetchIndexHandler(
        context,
        { body: { index: '.fleet-agents' } } as any,
        response as any
      );

      expect(result).toEqual({ body: searchResult, statusCode: 200 });
      expect(esClient.search).toHaveBeenCalledWith({ index: '.fleet-agents' });
    });
  });

  describe('fetchSavedObjectsHandler', () => {
    it('returns 400 when saved object type is not allowed for debug', async () => {
      const soClient = savedObjectsClientMock.create();
      const context = {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asInternalUser: elasticsearchServiceMock.createClusterClient().asInternalUser,
            },
          },
        }),
        fleet: Promise.resolve({ internalSoClient: soClient }),
      } as any;
      const response = createMockResponse();

      const result = await fetchSavedObjectsHandler(
        context,
        { body: { type: 'dashboard', name: 'foo' } } as any,
        response as any
      );

      expect(result).toEqual({
        body: { message: 'Saved object type not allowed for debug.' },
        statusCode: 400,
      });
      expect(soClient.find).not.toHaveBeenCalled();
    });

    it('returns 200 and calls fetchSavedObjects when type is allowed', async () => {
      const soClient = savedObjectsClientMock.create();
      const findResult = { saved_objects: [], total: 0, page: 1, per_page: 20 };
      soClient.find.mockResolvedValue(findResult as any);

      const context = {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asInternalUser: elasticsearchServiceMock.createClusterClient().asInternalUser,
            },
          },
        }),
        fleet: Promise.resolve({ internalSoClient: soClient }),
      } as any;
      const response = createMockResponse();

      const result = await fetchSavedObjectsHandler(
        context,
        { body: { type: OUTPUT_SAVED_OBJECT_TYPE, name: 'my-output' } } as any,
        response as any
      );

      expect(result).toEqual({ body: findResult, statusCode: 200 });
      expect(soClient.find).toHaveBeenCalledWith({
        type: OUTPUT_SAVED_OBJECT_TYPE,
        search: '"my-output"',
        searchFields: ['name'],
      });
    });
  });

  describe('fetchSavedObjectNamesHandler', () => {
    it('returns 400 when saved object type is not allowed for debug', async () => {
      const soClient = savedObjectsClientMock.create();
      const context = {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asInternalUser: elasticsearchServiceMock.createClusterClient().asInternalUser,
            },
          },
        }),
        fleet: Promise.resolve({ internalSoClient: soClient }),
      } as any;
      const response = createMockResponse();

      const result = await fetchSavedObjectNamesHandler(
        context,
        { body: { type: 'action' } } as any,
        response as any
      );

      expect(result).toEqual({
        body: { message: 'Saved object type not allowed for debug.' },
        statusCode: 400,
      });
      expect(soClient.find).not.toHaveBeenCalled();
    });

    it('returns 200 and calls fetchSavedObjectNames when type is allowed', async () => {
      const soClient = savedObjectsClientMock.create();
      const findResult = {
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 20,
        aggregations: { names: { buckets: [] } },
      };
      soClient.find.mockResolvedValue(findResult as any);

      const context = {
        core: Promise.resolve({
          elasticsearch: {
            client: {
              asInternalUser: elasticsearchServiceMock.createClusterClient().asInternalUser,
            },
          },
        }),
        fleet: Promise.resolve({ internalSoClient: soClient }),
      } as any;
      const response = createMockResponse();

      const result = await fetchSavedObjectNamesHandler(
        context,
        { body: { type: OUTPUT_SAVED_OBJECT_TYPE } } as any,
        response as any
      );

      expect(result).toEqual({ body: findResult, statusCode: 200 });
      expect(soClient.find).toHaveBeenCalledWith({
        type: OUTPUT_SAVED_OBJECT_TYPE,
        aggs: {
          names: {
            terms: { field: `${OUTPUT_SAVED_OBJECT_TYPE}.attributes.name` },
          },
        },
      });
    });
  });
});
