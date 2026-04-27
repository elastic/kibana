/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveRuleAPIKey } from './resolve_rule_api_key';
import type { RulesClientContext, CreateAPIKeyResult } from '../types';

const createMockContext = (overrides: Partial<RulesClientContext> = {}): RulesClientContext =>
  ({
    createAPIKey: jest.fn(),
    isAuthenticationTypeAPIKey: jest.fn().mockReturnValue(false),
    getAuthenticationAPIKey: jest.fn(),
    ...overrides,
  } as unknown as RulesClientContext);

describe('resolveRuleAPIKey', () => {
  describe('when rule is disabled', () => {
    test('returns null API key regardless of context', async () => {
      const cloneAPIKey = jest.fn();
      const context = createMockContext({ cloneAPIKey });

      const result = await resolveRuleAPIKey(context, 'test-rule', false);

      expect(result).toEqual({ createdAPIKey: null, isAuthTypeApiKey: false });
      expect(cloneAPIKey).not.toHaveBeenCalled();
    });
  });

  describe('when cloneAPIKey is provided', () => {
    test('uses cloneAPIKey and returns isAuthTypeApiKey false', async () => {
      const clonedKey: CreateAPIKeyResult = {
        apiKeysEnabled: true,
        result: { id: 'cloned-id', name: 'test-rule', api_key: 'cloned-secret' },
      };
      const cloneAPIKey = jest.fn().mockResolvedValue(clonedKey);
      const createAPIKey = jest.fn();
      const isAuthenticationTypeAPIKey = jest.fn().mockReturnValue(true);
      const context = createMockContext({ cloneAPIKey, createAPIKey, isAuthenticationTypeAPIKey });

      const result = await resolveRuleAPIKey(context, 'test-rule', true);

      expect(result).toEqual({ createdAPIKey: clonedKey, isAuthTypeApiKey: false });
      expect(cloneAPIKey).toHaveBeenCalledWith('test-rule');
      expect(createAPIKey).not.toHaveBeenCalled();
      expect(isAuthenticationTypeAPIKey).not.toHaveBeenCalled();
    });

    test('propagates errors from cloneAPIKey', async () => {
      const cloneAPIKey = jest.fn().mockRejectedValue(new Error('Unable to clone an API key'));
      const context = createMockContext({ cloneAPIKey });

      await expect(resolveRuleAPIKey(context, 'test-rule', true)).rejects.toThrow(
        'Unable to clone an API key'
      );
    });
  });

  describe('when cloneAPIKey is not provided', () => {
    test('uses getAuthenticationAPIKey when auth type is API key', async () => {
      const userKey: CreateAPIKeyResult = {
        apiKeysEnabled: true,
        result: { id: 'user-key-id', name: 'test-rule-user-created', api_key: 'user-secret' },
      };
      const context = createMockContext({
        isAuthenticationTypeAPIKey: jest.fn().mockReturnValue(true),
        getAuthenticationAPIKey: jest.fn().mockReturnValue(userKey),
      });

      const result = await resolveRuleAPIKey(context, 'test-rule', true);

      expect(result).toEqual({ createdAPIKey: userKey, isAuthTypeApiKey: true });
      expect(context.getAuthenticationAPIKey).toHaveBeenCalledWith('test-rule-user-created');
      expect(context.createAPIKey).not.toHaveBeenCalled();
    });

    test('uses createAPIKey when auth type is not API key', async () => {
      const grantedKey: CreateAPIKeyResult = {
        apiKeysEnabled: true,
        result: { id: 'granted-id', name: 'test-rule', api_key: 'granted-secret' },
      };
      const context = createMockContext({
        createAPIKey: jest.fn().mockResolvedValue(grantedKey),
      });

      const result = await resolveRuleAPIKey(context, 'test-rule', true);

      expect(result).toEqual({ createdAPIKey: grantedKey, isAuthTypeApiKey: false });
      expect(context.createAPIKey).toHaveBeenCalledWith('test-rule');
    });
  });
});
