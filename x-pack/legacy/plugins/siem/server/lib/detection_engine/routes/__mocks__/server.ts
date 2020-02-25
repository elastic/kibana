/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandler,
  RouteConfig,
  KibanaRequest,
} from '../../../../../../../../../src/core/server';
import { httpServiceMock, httpServerMock } from '../../../../../../../../../src/core/server/mocks';
import { requestContextMock } from './request_context';

export { requestContextMock };

interface Route {
  config: RouteConfig<unknown, unknown, unknown, 'get'>;
  handler: RequestHandler;
}

const createMockServer = () => {
  const routeSpy = jest.fn();
  const router = httpServiceMock.createRouter();
  const response = httpServerMock.createResponseFactory();
  const context = requestContextMock.create();

  router.get.mockImplementation(routeSpy);
  router.post.mockImplementation(routeSpy);
  router.patch.mockImplementation(routeSpy);
  router.put.mockImplementation(routeSpy);
  router.delete.mockImplementation(routeSpy);

  const getRoute = (): Route => {
    const [config, handler] = routeSpy.mock.calls[routeSpy.mock.calls.length - 1];
    return { config, handler };
  };

  const inject = (request: KibanaRequest) => {
    return getRoute().handler(context, request, response);
  };

  return {
    getRoute,
    router,
    inject,
    response,
  };
};

export const serverMock = {
  create: createMockServer,
};
