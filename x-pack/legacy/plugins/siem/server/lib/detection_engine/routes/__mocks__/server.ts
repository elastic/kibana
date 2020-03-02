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
  config: RouteConfig<unknown, unknown, unknown, 'get' | 'post' | 'delete' | 'patch' | 'put'>;
  handler: RequestHandler;
}

const buildRoutingTools = () => {
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

  return { routerMock: mock, getRoute };
};

const buildResultMock = () => ({ ok: jest.fn(x => x), badRequest: jest.fn(x => x) });

class MockServer {
  public router: ReturnType<typeof httpServiceMock.createRouter>;

  constructor(
    private routing = buildRoutingTools(),
    private responseMock = responseFactoryMock.create(),
    private contextMock = requestContextMock.create(),
    private resultMock = buildResultMock()
  ) {
    this.router = this.routing.routerMock;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private maybeValidate(part: any, validator?: any): any {
    return typeof validator === 'function' ? validator(part, this.resultMock) : part;
  }

  private validateRequest(request: KibanaRequest): KibanaRequest {
    const validations = this.routing.getRoute().config.validate;

    if (!validations) {
      return request;
    }

    const validatedRequest = requestMock.create({
      path: request.route.path,
      method: request.route.method,
      body: this.maybeValidate(request.body, validations.body),
      query: this.maybeValidate(request.query, validations.query),
      params: this.maybeValidate(request.params, validations.params),
    });

    return validatedRequest;
  }

  public validate(request: KibanaRequest) {
    this.validateRequest(request);
    return this.resultMock;
  }

  public async inject(request: KibanaRequest, context: RequestHandlerContext = this.contextMock) {
    const validatedRequest = this.validateRequest(request);
    const [rejection] = this.resultMock.badRequest.mock.calls;
    if (rejection) {
      throw new Error(`Request was rejected with message: '${rejection}'`);
    }

    await this.routing.getRoute().handler(context, validatedRequest, this.responseMock);
    return responseAdapter(this.responseMock);
  }
}

const createMockServer = () => new MockServer();

export const serverMock = {
  create: createMockServer,
};
