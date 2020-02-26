/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandler,
  RouteConfig,
  KibanaRequest,
  RequestHandlerContext,
} from '../../../../../../../../../src/core/server';
import { httpServiceMock } from '../../../../../../../../../src/core/server/mocks';
import { requestContextMock } from './request_context';
import { responseMock as responseFactoryMock } from './response_factory';

interface Route {
  config: RouteConfig<unknown, unknown, unknown, 'get'>;
  handler: RequestHandler;
}

const createMockServer = () => {
  const routeSpy = jest.fn();
  const routerMock = httpServiceMock.createRouter();
  const responseMock = responseFactoryMock.create();
  const contextMock = requestContextMock.create();

  routerMock.get.mockImplementation(routeSpy);
  routerMock.post.mockImplementation(routeSpy);
  routerMock.patch.mockImplementation(routeSpy);
  routerMock.put.mockImplementation(routeSpy);
  routerMock.delete.mockImplementation(routeSpy);

  const getRoute = (): Route => {
    const [config, handler] = routeSpy.mock.calls[routeSpy.mock.calls.length - 1];
    return { config, handler };
  };

  const inject = async (request: KibanaRequest, context: RequestHandlerContext = contextMock) => {
    await getRoute().handler(context, request, responseMock);
    return responseMock;
  };

  return {
    getRoute,
    inject,
    router: routerMock,
  };
};

export const serverMock = {
  create: createMockServer,
};
