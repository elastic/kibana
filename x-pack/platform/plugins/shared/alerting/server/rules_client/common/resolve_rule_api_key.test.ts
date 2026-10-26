/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveRuleAPIKey } from './resolve_rule_api_key';
import type { RulesClientContext, CreateAPIKeyResult } from '../types';

const clonedKey: CreateAPIKeyResult = {
  apiKeysEnabled: true,
  result: { id: 'cloned-id', name: 'test-rule', api_key: 'cloned-secret' },
};
const grantedKey: CreateAPIKeyResult = {
  apiKeysEnabled: true,
  result: { id: 'granted-id', name: 'test-rule', api_key: 'granted-secret' },
};
const userKey: CreateAPIKeyResult = {
  apiKeysEnabled: true,
  result: { id: 'user-key-id', name: 'test-rule-user-created', api_key: 'user-secret' },
};

const createMockContext = (overrides: Partial<RulesClientContext> = {}): RulesClientContext =>
  ({
    createAPIKey: jest.fn().mockResolvedValue(grantedKey),
    isAuthenticationTypeAPIKey: jest.fn().mockReturnValue(false),
    getAuthenticationAPIKey: jest.fn().mockReturnValue(userKey),
    cloneAPIKey: jest.fn().mockResolvedValue(clonedKey),
    cloneApiKeysOnCreate: false,
    ...overrides,
  } as unknown as RulesClientContext);

const sessionContext = (overrides: Partial<RulesClientContext> = {}) =>
  createMockContext(overrides);
const apiKeyContext = (overrides: Partial<RulesClientContext> = {}) =>
  createMockContext({ isAuthenticationTypeAPIKey: jest.fn().mockReturnValue(true), ...overrides });

const expectGranted = (context: RulesClientContext, refresh?: boolean | 'wait_for') => {
  expect(context.createAPIKey).toHaveBeenCalledWith('test-rule', refresh);
  expect(context.cloneAPIKey).not.toHaveBeenCalled();
  expect(context.getAuthenticationAPIKey).not.toHaveBeenCalled();
};
const expectCloned = (context: RulesClientContext) => {
  expect(context.cloneAPIKey).toHaveBeenCalledWith('test-rule');
  expect(context.createAPIKey).not.toHaveBeenCalled();
  expect(context.getAuthenticationAPIKey).not.toHaveBeenCalled();
};
const expectRequestKeyUsed = (context: RulesClientContext) => {
  expect(context.getAuthenticationAPIKey).toHaveBeenCalledWith('test-rule-user-created');
  expect(context.cloneAPIKey).not.toHaveBeenCalled();
  expect(context.createAPIKey).not.toHaveBeenCalled();
};

describe('resolveRuleAPIKey', () => {
  describe('when rule is disabled', () => {
    test('returns null regardless of auth type or declaration', async () => {
      const context = apiKeyContext({ cloneApiKeysOnCreate: true });

      const result = await resolveRuleAPIKey(context, 'test-rule', false, { cloneApiKey: true });

      expect(result).toEqual({ createdAPIKey: null, isAuthTypeApiKey: false });
      expect(context.cloneAPIKey).not.toHaveBeenCalled();
      expect(context.createAPIKey).not.toHaveBeenCalled();
      expect(context.getAuthenticationAPIKey).not.toHaveBeenCalled();
    });
  });

  // The choice depends on the request only; the rule's existing ownership is never consulted.
  describe('session authentication (no API key in the request)', () => {
    test('grants a framework-managed key', async () => {
      const context = sessionContext();

      const result = await resolveRuleAPIKey(context, 'test-rule', true);

      expect(result).toEqual({ createdAPIKey: grantedKey, isAuthTypeApiKey: false });
      expectGranted(context);
    });

    test('forwards refresh to createAPIKey', async () => {
      const context = sessionContext();

      await resolveRuleAPIKey(context, 'test-rule', true, { refresh: false });

      expectGranted(context, false);
    });

    test('a borrowed declaration is a no-op (nothing to clone): still grants', async () => {
      for (const context of [
        sessionContext({ cloneApiKeysOnCreate: true }),
        sessionContext(),
      ] as const) {
        const result = await resolveRuleAPIKey(context, 'test-rule', true, { cloneApiKey: true });

        expect(result).toEqual({ createdAPIKey: grantedKey, isAuthTypeApiKey: false });
        expectGranted(context);
      }
    });
  });

  describe('API key authentication, undeclared (user-provided key)', () => {
    test('stores the key from the request and marks the rule user-owned', async () => {
      const context = apiKeyContext();

      const result = await resolveRuleAPIKey(context, 'test-rule', true);

      expect(result).toEqual({ createdAPIKey: userKey, isAuthTypeApiKey: true });
      expectRequestKeyUsed(context);
    });

    test('an explicit cloneApiKey: false is the same as undeclared', async () => {
      const context = apiKeyContext();

      const result = await resolveRuleAPIKey(context, 'test-rule', true, { cloneApiKey: false });

      expect(result).toEqual({ createdAPIKey: userKey, isAuthTypeApiKey: true });
      expectRequestKeyUsed(context);
    });
  });

  describe('API key authentication, declared borrowed', () => {
    test('clones via the per-call cloneApiKey option and never persists the request key', async () => {
      const context = apiKeyContext();

      const result = await resolveRuleAPIKey(context, 'test-rule', true, { cloneApiKey: true });

      expect(result).toEqual({ createdAPIKey: clonedKey, isAuthTypeApiKey: false });
      expectCloned(context);
    });

    test('clones via the client-level cloneApiKeysOnCreate flag', async () => {
      const context = apiKeyContext({ cloneApiKeysOnCreate: true });

      const result = await resolveRuleAPIKey(context, 'test-rule', true);

      expect(result).toEqual({ createdAPIKey: clonedKey, isAuthTypeApiKey: false });
      expectCloned(context);
    });

    test('propagates errors from cloneAPIKey', async () => {
      const context = apiKeyContext({
        cloneAPIKey: jest.fn().mockRejectedValue(new Error('clone failed')),
      });

      await expect(
        resolveRuleAPIKey(context, 'test-rule', true, { cloneApiKey: true })
      ).rejects.toThrow('clone failed');
    });
  });
});
