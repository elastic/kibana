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
import { requestMock } from '.';

interface Route {
  config: RouteConfig<unknown, unknown, unknown, 'get' | 'post'>;
  handler: RequestHandler;
}

const getRoute = (routeSpy: jest.Mock): Route => {
  const [config, handler] = routeSpy.mock.calls[routeSpy.mock.calls.length - 1];
  return { config, handler };
};

type ValidationResult = ReturnType<typeof buildResultMock>;
const buildResultMock = () => ({ ok: jest.fn(x => x), badRequest: jest.fn(x => x) });

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

  const validateRequest = (request: KibanaRequest): [KibanaRequest, ValidationResult] => {
    const result = buildResultMock();
    const validations = getRoute(routeSpy).config.validate;

    if (!validations) {
      return [request, result];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeValidate = (part: any, validator?: any): any =>
      typeof validator === 'function' ? validator(part, result) : part;

    const validatedRequest = requestMock.create({
      path: request.route.path,
      method: request.route.method,
      body: maybeValidate(request.body, validations.body),
      query: maybeValidate(request.query, validations.query),
      params: maybeValidate(request.params, validations.params),
    });

    return [validatedRequest, result];
  };

  const validate = (request: KibanaRequest) => {
    const [, resultMock] = validateRequest(request);
    return resultMock;
  };

  const inject = async (request: KibanaRequest, context: RequestHandlerContext = contextMock) => {
    const [validatedRequest, result] = validateRequest(request);

    // transfer our failed validation to the response mock
    for (const call of result.badRequest.mock.calls) {
      responseMock.badRequest(...call);
    }

    await getRoute(routeSpy).handler(context, validatedRequest, responseMock);
    return responseMock;
  };

  return {
    inject,
    router: routerMock,
    validate,
  };
};

export const serverMock = {
  create: createMockServer,
};
