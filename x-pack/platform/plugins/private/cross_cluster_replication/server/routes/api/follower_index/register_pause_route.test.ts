/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';

import { handleEsError } from '../../../shared_imports';
import { mockRouteContext, mockLicense, mockError } from '../test_lib';
import { registerPauseRoute } from './register_pause_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Pause follower index/indices', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerPauseRoute({
      router,
      license: mockLicense,
      lib: {
        handleEsError,
      },
    });

    routeHandler = router.put.mock.calls[0][1];
  });

  it('pauses a single item', async () => {
    const routeContextMock = mockRouteContext({
      ccr: {
        pauseFollow: jest.fn().mockResolvedValueOnce({ acknowledge: true }),
      },
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'a' },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.payload.itemsPaused).toEqual(['a']);
    expect(response.payload.errors).toEqual([]);
  });

  it('pauses multiple items', async () => {
    const routeContextMock = mockRouteContext({
      ccr: {
        pauseFollow: jest
          .fn()
          .mockResolvedValueOnce({ acknowledge: true })
          .mockResolvedValueOnce({ acknowledge: true })
          .mockResolvedValueOnce({ acknowledge: true }),
      },
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'a,b,c' },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.payload.itemsPaused).toEqual(['a', 'b', 'c']);
    expect(response.payload.errors).toEqual([]);
  });

  it('returns partial errors', async () => {
    const routeContextMock = mockRouteContext({
      ccr: {
        pauseFollow: jest
          .fn()
          .mockResolvedValueOnce({ acknowledge: true })
          .mockRejectedValueOnce(mockError),
      },
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'a,b' },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.payload.itemsPaused).toEqual(['a']);
    expect(response.payload.errors[0].id).toEqual('b');
  });
});
