/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { License } from '../../services';
import { isEsError, wrapEsError } from '../../lib';

type RequestHandler = (...params: any[]) => any;

type RequestMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

interface HandlersByUrl {
  [key: string]: RequestHandler;
}

const mockResponse = {
  ok(response: any) {
    return response;
  },
};

export interface RunRequestParam {
  method: RequestMethod;
  path: string;
  mockRequest?: { [key: string]: any };
}

export class MockRouter {
  private cacheHandlers: { [key: string]: HandlersByUrl } = {
    get: {},
    post: {},
    put: {},
    delete: {},
    patch: {},
  };

  private _callAsCurrentUserCallCount = 0;
  private _callAsCurrentUserResponses: any[] = [];

  get({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.get[path] = handler;
  }

  post({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.post[path] = handler;
  }

  put({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.put[path] = handler;
  }

  delete({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.delete[path] = handler;
  }

  patch({ path }: { path: string }, handler: RequestHandler) {
    this.cacheHandlers.patch[path] = handler;
  }

  private callAsCurrentUser() {
    const index = this._callAsCurrentUserCallCount;
    this._callAsCurrentUserCallCount += 1;
    return this._callAsCurrentUserResponses[index]();
  }

  public set callAsCurrentUserResponses(responses: any[]) {
    this._callAsCurrentUserCallCount = 0;
    this._callAsCurrentUserResponses = responses;
  }

  runRequest({ method, path, mockRequest = {} }: RunRequestParam) {
    const mockContext = {
      core: {
        elasticsearch: {
          dataClient: { callAsCurrentUser: this.callAsCurrentUser.bind(this) },
        },
      },
    };

    const handler = this.cacheHandlers[method][path];
    return handler(mockContext, mockRequest, mockResponse);
  }
}

const license = new License();
license.getStatus = jest.fn().mockReturnValue({ isValid: true });

export const routeDependencies = {
  license,
  config: {
    isSecurityEnabled: true,
    isCloudEnabled: false,
    isSlmEnabled: true,
  },
  lib: {
    isEsError,
    wrapEsError,
  },
};
