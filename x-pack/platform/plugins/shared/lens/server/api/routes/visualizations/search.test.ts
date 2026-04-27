/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, RequestHandlerContext } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import type { VersionedRouter } from '@kbn/core-http-server';
import type { ContentManagementServerSetup } from '@kbn/content-management-plugin/server';
import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';

import { registerLensVisualizationsSearchAPIRoute } from './search';
import { LENS_VIS_API_PATH, LENS_API_VERSION } from '../../../../common/constants';

// We mock getLensResponseItem to avoid setting up a complex LensConfigBuilder
// just to test the pagination logic for now, which doesn't rely on the actual data formatting.
jest.mock('./utils', () => ({
  getLensResponseItem: jest.fn().mockImplementation((builder, item) => item),
}));

describe('Lens API - Visualizations Search Route', () => {
  it('maps API per_page to internal perPage/limit and vice versa', async () => {
    // Setup Router Mocks
    const mockRoute = { addVersion: jest.fn() };
    const mockRouter = {
      get: jest.fn().mockReturnValue(mockRoute),
    } as unknown as VersionedRouter<RequestHandlerContext>;

    // Setup Content Management Mocks
    const mockSearch = jest.fn().mockResolvedValue({
      result: { hits: [], pagination: { total: 0 } },
    });
    const mockFor = jest.fn().mockReturnValue({ search: mockSearch });
    const mockGetForRequest = jest.fn().mockReturnValue({ for: mockFor });
    const mockContentManagement = {
      contentClient: { getForRequest: mockGetForRequest },
    } as unknown as ContentManagementServerSetup;

    const mockBuilder = {} as unknown as LensConfigBuilder;

    // Register the route
    registerLensVisualizationsSearchAPIRoute(mockRouter, {
      contentManagement: mockContentManagement,
      builder: mockBuilder,
      logger: {} as unknown as Logger,
      usageCounter: undefined,
    });

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: LENS_VIS_API_PATH })
    );

    // Get the handler registered to addVersion
    const addVersionArgs = mockRoute.addVersion.mock.calls[0];
    expect(addVersionArgs[0].version).toBe(LENS_API_VERSION);

    const routeHandler = addVersionArgs[1];

    // Setup request and response mocks using core testing utilities
    const mockCtx = {} as unknown as RequestHandlerContext;
    const mockReq = httpServerMock.createKibanaRequest({
      query: {
        query: 'search query',
        page: 2,
        per_page: 50,
      },
    });

    const mockRes = httpServerMock.createResponseFactory();
    mockRes.ok = jest.fn().mockImplementation((payload) => payload);

    // Invoke the handler
    const responsePayload = (await routeHandler(mockCtx, mockReq, mockRes)) as {
      body: { meta: { per_page: number } };
    };

    // Verify:
    // 1. The request mapper correctly extracts `per_page: 50` and provides it to the search API as `limit: 50`
    expect(mockSearch).toHaveBeenCalledWith(
      {
        text: 'search query',
        cursor: '2',
        limit: 50,
      },
      {}
    );

    // 2. The handler responds with the `meta` object correctly formatted with `per_page`
    expect(mockRes.ok).toHaveBeenCalledWith({
      body: {
        data: [],
        meta: {
          page: 2,
          per_page: 50,
          total: 0,
        },
      },
    });

    // 3. The response meta contains the correct `per_page` value
    expect(responsePayload.body.meta.per_page).toBe(50);
  });
});
