/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { Global } from '@kbn/core-di-internal';
import { Request } from '@kbn/core-di-server';
import type { CoreDiServiceStart } from '@kbn/core-di';
import { RulesClient } from '../lib/rules_client';
import { buildScopedRulesClientFactory } from './scoped_rules_client_factory';

const createMockScope = () => ({
  bind: jest.fn().mockReturnValue({ toConstantValue: jest.fn() }),
  get: jest.fn().mockReturnValue({} as RulesClient),
});

const createMockInjection = (scope = createMockScope()): CoreDiServiceStart => ({
  fork: jest.fn().mockReturnValue(scope),
  getContainer: jest.fn(),
});

describe('buildScopedRulesClientFactory', () => {
  it('forks the container on each call', () => {
    const scope = createMockScope();
    const injection = createMockInjection(scope);
    const getInjection = jest.fn().mockReturnValue(injection);

    const factory = buildScopedRulesClientFactory(getInjection);
    factory(httpServerMock.createKibanaRequest());

    expect(injection.fork).toHaveBeenCalledTimes(1);
  });

  it('binds the request to the Request token', () => {
    const scope = createMockScope();
    const getInjection = jest.fn().mockReturnValue(createMockInjection(scope));

    const factory = buildScopedRulesClientFactory(getInjection);
    const request = httpServerMock.createKibanaRequest();
    factory(request);

    expect(scope.bind).toHaveBeenCalledWith(Request);
    expect(scope.bind.mock.results[0].value.toConstantValue).toHaveBeenCalledWith(request);
  });

  it('binds Global to the Request token to activate request scope', () => {
    const scope = createMockScope();
    const getInjection = jest.fn().mockReturnValue(createMockInjection(scope));

    const factory = buildScopedRulesClientFactory(getInjection);
    factory(httpServerMock.createKibanaRequest());

    expect(scope.bind).toHaveBeenCalledWith(Global);
    expect(scope.bind.mock.results[1].value.toConstantValue).toHaveBeenCalledWith(Request);
  });

  it('resolves RulesClient from the forked scope', () => {
    const mockRulesClient = {} as RulesClient;
    const scope = createMockScope();
    scope.get.mockReturnValue(mockRulesClient);
    const getInjection = jest.fn().mockReturnValue(createMockInjection(scope));

    const factory = buildScopedRulesClientFactory(getInjection);
    const result = factory(httpServerMock.createKibanaRequest());

    expect(scope.get).toHaveBeenCalledWith(RulesClient);
    expect(result).toBe(mockRulesClient);
  });

  it('creates a fresh scope for each request', () => {
    const scope1 = createMockScope();
    const scope2 = createMockScope();
    const injection = {
      fork: jest.fn().mockReturnValueOnce(scope1).mockReturnValueOnce(scope2),
      getContainer: jest.fn(),
    } as CoreDiServiceStart;
    const getInjection = jest.fn().mockReturnValue(injection);

    const factory = buildScopedRulesClientFactory(getInjection);
    factory(httpServerMock.createKibanaRequest());
    factory(httpServerMock.createKibanaRequest());

    expect(injection.fork).toHaveBeenCalledTimes(2);
    expect(scope1.get).toHaveBeenCalledTimes(1);
    expect(scope2.get).toHaveBeenCalledTimes(1);
  });
});
