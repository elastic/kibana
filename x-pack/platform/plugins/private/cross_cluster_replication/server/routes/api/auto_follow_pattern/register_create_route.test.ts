/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock } from '@kbn/core/server/mocks';
import { kibanaResponseFactory, RequestHandler } from '@kbn/core/server';

import { handleEsError } from '../../../shared_imports';
import { mockRouteContext, mockLicense } from '../test_lib';
import { registerCreateRoute } from './register_create_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Create auto-follow pattern', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerCreateRoute({
      router,
      license: mockLicense,
      lib: {
        handleEsError,
      },
    });

    routeHandler = router.post.mock.calls[0][1];
  });

  it('should throw a 409 conflict error if id already exists', async () => {
    const routeContextMock = mockRouteContext({
      ccr: {
        // Fail the uniqueness check.
        getAutoFollowPattern: jest.fn().mockResolvedValueOnce(true),
      },
    });

    const request = httpServerMock.createKibanaRequest({
      body: {
        id: 'some-id',
        foo: 'bar',
      },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.status).toEqual(409);
  });

  it('should return 200 status when the id does not exist', async () => {
    const routeContextMock = mockRouteContext({
      ccr: {
        // Pass the uniqueness check.
        getAutoFollowPattern: jest.fn().mockRejectedValueOnce({ statusCode: 404 }),
        putAutoFollowPattern: jest.fn().mockResolvedValueOnce(true),
      },
    });

    const request = httpServerMock.createKibanaRequest({
      body: {
        id: 'some-id',
        foo: 'bar',
      },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);
    expect(response.status).toEqual(200);
  });
});
