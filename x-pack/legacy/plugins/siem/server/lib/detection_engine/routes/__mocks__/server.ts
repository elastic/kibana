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
import { responseAdapter } from './test_adapters';

interface Route {
  config: RouteConfig<unknown, unknown, unknown, 'get' | 'post'>;
  handler: RequestHandler;
}

const buildRouterMock = () => {
  const mock = httpServiceMock.createRouter();
  const spy = jest.fn();

  mock.get.mockImplementation(spy);
  mock.post.mockImplementation(spy);
  mock.patch.mockImplementation(spy);
  mock.put.mockImplementation(spy);
  mock.delete.mockImplementation(spy);

  const getRoute = (): Route => {
    const [route] = spy.mock.calls;
    if (!route) {
      throw new Error('No route registered!');
    }

    const [config, handler] = route;
    return { config, handler };
  };

  return { mock, getRoute };
};

type ValidationResult = ReturnType<typeof buildResultMock>;
const buildResultMock = () => ({ ok: jest.fn(x => x), badRequest: jest.fn(x => x) });

const createMockServer = () => {
  const router = buildRouterMock();
  const responseMock = responseFactoryMock.create();
  const contextMock = requestContextMock.create();

  const validateRequest = (request: KibanaRequest): [KibanaRequest, ValidationResult] => {
    const result = buildResultMock();
    const validations = router.getRoute().config.validate;

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
    const [rejection] = result.badRequest.mock.calls;
    if (rejection) {
      throw new Error(`Request was rejected with message: '${rejection}'`);
    }

    await router.getRoute().handler(context, validatedRequest, responseMock);
    return responseAdapter(responseMock);
  };

  return {
    inject,
    router: router.mock,
    validate,
  };
};

export const serverMock = {
  create: createMockServer,
};
