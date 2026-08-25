/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { grantBulkApiKeys } from './grant_bulk_api_keys';
import type { CreateAPIKeyResult, RulesClientContext } from '../types';

const granted: CreateAPIKeyResult = {
  apiKeysEnabled: true,
  result: { id: 'granted-id', name: 'Alerting: query/a', api_key: 'secret' },
};

const createMockContext = (overrides: Partial<RulesClientContext> = {}): RulesClientContext =>
  ({
    createAPIKeys: jest.fn().mockResolvedValue([granted]),
    createAPIKey: jest.fn().mockResolvedValue(granted),
    cloneAPIKey: jest.fn(),
    getAuthenticationAPIKey: jest.fn(),
    isAuthenticationTypeAPIKey: jest.fn().mockReturnValue(false),
    cloneApiKeysOnCreate: false,
    logger: { debug: jest.fn() },
    ...overrides,
  } as unknown as RulesClientContext);

describe('grantBulkApiKeys', () => {
  test('falls back to per-rule createAPIKey when createAPIKeys is not wired', async () => {
    const createAPIKey = jest.fn().mockResolvedValue(granted);
    const context = createMockContext({ createAPIKeys: undefined, createAPIKey });
    const result = await grantBulkApiKeys(context, [
      { id: '1', typeId: 'query', name: 'a', enabled: true },
    ]);
    expect(createAPIKey).toHaveBeenCalledWith('Alerting: query/a');
    expect(result.granted.get('1')).toEqual({ result: granted, createdByUser: false });
  });

  test('skips disabled rules', async () => {
    const createAPIKeys = jest.fn();
    const createAPIKey = jest.fn();
    const context = createMockContext({ createAPIKeys, createAPIKey });

    const result = await grantBulkApiKeys(context, [
      { id: 'disabled', typeId: 'query', name: 'a', enabled: false },
    ]);

    expect(createAPIKeys).not.toHaveBeenCalled();
    expect(createAPIKey).not.toHaveBeenCalled();
    expect(result.granted.size).toBe(0);
  });

  test('reuses the caller key instead of granting when auth is API key', async () => {
    const userKey: CreateAPIKeyResult = {
      apiKeysEnabled: true,
      result: { id: 'user', name: 'user', api_key: 'u' },
    };
    const createAPIKeys = jest.fn();
    const context = createMockContext({
      createAPIKeys,
      isAuthenticationTypeAPIKey: jest.fn().mockReturnValue(true),
      getAuthenticationAPIKey: jest.fn().mockReturnValue(userKey),
    });

    const result = await grantBulkApiKeys(context, [
      { id: 'reuse', typeId: 'query', name: 'b', enabled: true },
    ]);

    expect(createAPIKeys).not.toHaveBeenCalled();
    expect(result.granted.get('reuse')).toEqual({ result: userKey, createdByUser: true });
  });

  test('grants enabled rules that take the ES grant path', async () => {
    const createAPIKeys = jest.fn().mockResolvedValue([granted]);
    const context = createMockContext({ createAPIKeys });

    const result = await grantBulkApiKeys(context, [
      { id: '1', typeId: 'query', name: 'a', enabled: true },
    ]);

    expect(createAPIKeys).toHaveBeenCalledWith(['Alerting: query/a']);
    expect(context.createAPIKey).not.toHaveBeenCalled();
    expect(result.granted.get('1')).toEqual({ result: granted, createdByUser: false });
  });

  test('falls back to per-rule createAPIKey when createAPIKeys throws', async () => {
    const createAPIKey = jest.fn().mockResolvedValue(granted);
    const context = createMockContext({
      createAPIKeys: jest.fn().mockRejectedValue(new Error('boom')),
      createAPIKey,
    });

    const result = await grantBulkApiKeys(context, [
      { id: '1', typeId: 'query', name: 'a', enabled: true },
    ]);

    expect(createAPIKey).toHaveBeenCalledWith('Alerting: query/a');
    expect(result.granted.get('1')).toEqual({ result: granted, createdByUser: false });
    expect(context.logger.debug).toHaveBeenCalled();
  });
});
