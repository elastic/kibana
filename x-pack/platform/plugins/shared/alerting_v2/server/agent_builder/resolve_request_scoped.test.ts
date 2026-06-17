/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { ProvidedService } from '@kbn/core-di-internal';
import { Request } from '@kbn/core-di-server';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { resolveRequestScoped } from './resolve_request_scoped';

const TOKEN = Symbol.for('test.token');

const createMockScope = () => ({
  bind: jest.fn().mockReturnValue({ toConstantValue: jest.fn() }),
  get: jest.fn().mockReturnValue({}),
});

const createMockInjection = (scope = createMockScope()): CoreDiServiceStart =>
  ({
    fork: jest.fn().mockReturnValue(scope),
    getContainer: jest.fn(),
  } as unknown as CoreDiServiceStart);

describe('resolveRequestScoped', () => {
  it('forks the container on each call', () => {
    const scope = createMockScope();
    const injection = createMockInjection(scope);

    resolveRequestScoped(injection, httpServerMock.createKibanaRequest(), TOKEN);

    expect(injection.fork).toHaveBeenCalledTimes(1);
  });

  it('binds the request to the Request token', () => {
    const scope = createMockScope();
    const request = httpServerMock.createKibanaRequest();

    resolveRequestScoped(createMockInjection(scope), request, TOKEN);

    expect(scope.bind).toHaveBeenCalledWith(Request);
    expect(scope.bind.mock.results[0].value.toConstantValue).toHaveBeenCalledWith(request);
  });

  it('binds ProvidedService to the Request token to activate request scope', () => {
    const scope = createMockScope();

    resolveRequestScoped(createMockInjection(scope), httpServerMock.createKibanaRequest(), TOKEN);

    expect(scope.bind).toHaveBeenCalledWith(ProvidedService);
    expect(scope.bind.mock.results[1].value.toConstantValue).toHaveBeenCalledWith(Request);
  });

  it('resolves the requested token from the forked scope', () => {
    const resolved = {};
    const scope = createMockScope();
    scope.get.mockReturnValue(resolved);

    const result = resolveRequestScoped(
      createMockInjection(scope),
      httpServerMock.createKibanaRequest(),
      TOKEN
    );

    expect(scope.get).toHaveBeenCalledWith(TOKEN);
    expect(result).toBe(resolved);
  });

  it('creates a fresh scope for each request', () => {
    const scope1 = createMockScope();
    const scope2 = createMockScope();
    const injection = {
      fork: jest.fn().mockReturnValueOnce(scope1).mockReturnValueOnce(scope2),
      getContainer: jest.fn(),
    } as unknown as CoreDiServiceStart;

    resolveRequestScoped(injection, httpServerMock.createKibanaRequest(), TOKEN);
    resolveRequestScoped(injection, httpServerMock.createKibanaRequest(), TOKEN);

    expect(injection.fork).toHaveBeenCalledTimes(2);
    expect(scope1.get).toHaveBeenCalledTimes(1);
    expect(scope2.get).toHaveBeenCalledTimes(1);
  });
});
