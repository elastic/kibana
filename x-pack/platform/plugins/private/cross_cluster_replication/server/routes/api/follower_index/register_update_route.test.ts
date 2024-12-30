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
import { registerUpdateRoute } from './register_update_route';

const httpService = httpServiceMock.createSetupContract();

describe('[CCR API] Update follower index', () => {
  let routeHandler: RequestHandler<any, any, any>;

  beforeEach(() => {
    const router = httpService.createRouter();

    registerUpdateRoute({
      router,
      license: mockLicense,
      lib: {
        handleEsError,
      },
    });

    routeHandler = router.put.mock.calls[0][1];
  });

  it('should serialize the payload before sending it to Elasticsearch', async () => {
    const routeContextMock = mockRouteContext({
      ccr: {
        followInfo: jest.fn().mockResolvedValueOnce({ follower_indices: [{ status: 'paused' }] }),
        // Just echo back what we send so we can inspect it.
        resumeFollow: jest.fn().mockImplementation((payload) => payload),
      },
    });

    const request = httpServerMock.createKibanaRequest({
      params: { id: 'foo' },
      body: {
        maxReadRequestOperationCount: 1,
        maxOutstandingReadRequests: 1,
        maxReadRequestSize: '1b',
        maxWriteRequestOperationCount: 1,
        maxWriteRequestSize: '1b',
        maxOutstandingWriteRequests: 1,
        maxWriteBufferCount: 1,
        maxWriteBufferSize: '1b',
        maxRetryDelay: '1s',
        readPollTimeout: '1s',
      },
    });

    const response = await routeHandler(routeContextMock, request, kibanaResponseFactory);

    expect(response.payload).toEqual({
      index: 'foo',
      body: {
        max_outstanding_read_requests: 1,
        max_outstanding_write_requests: 1,
        max_read_request_operation_count: 1,
        max_read_request_size: '1b',
        max_retry_delay: '1s',
        max_write_buffer_count: 1,
        max_write_buffer_size: '1b',
        max_write_request_operation_count: 1,
        max_write_request_size: '1b',
        read_poll_timeout: '1s',
      },
    });
  });
});
