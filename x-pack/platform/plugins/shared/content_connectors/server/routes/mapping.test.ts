/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from '@kbn/core/server';

jest.mock('../lib/fetch_mapping', () => ({
  fetchMapping: jest.fn(),
}));
import { fetchMapping } from '../lib/fetch_mapping';

import { registerMappingRoute } from './mapping';
import { mockDependencies, MockRouter } from '../__mocks__';

describe('Elasticsearch Index Mapping', () => {
  let mockRouter: MockRouter;
  const mockClient = {};

  beforeEach(() => {
    const context = {
      core: Promise.resolve({ elasticsearch: { client: mockClient } }),
    } as jest.Mocked<RequestHandlerContext>;

    mockRouter = new MockRouter({
      context,
      method: 'get',
      path: '/internal/content_connectors/mappings/{index_name}',
    });

    registerMappingRoute({
      ...mockDependencies,
      router: mockRouter.router,
    });
  });
  describe('GET /internal/content_connectors/mappings/{index_name}', () => {
    it('fails validation without index_name', () => {
      const request = { params: {} };
      mockRouter.shouldThrow(request);
    });

    it('returns the mapping for an Elasticsearch index', async () => {
      const mockData = {
        mappings: {
          dynamic: true,
          dynamic_templates: [],
          properties: {},
        },
      };

      (fetchMapping as jest.Mock).mockImplementationOnce(() => {
        return Promise.resolve(mockData);
      });

      await mockRouter.callRoute({
        params: { index_name: 'search-index-name' },
      });

      expect(fetchMapping).toHaveBeenCalledWith(mockClient, 'search-index-name');

      expect(mockRouter.response.ok).toHaveBeenCalledWith({
        body: mockData,
        headers: { 'content-type': 'application/json' },
      });
    });
  });
});
