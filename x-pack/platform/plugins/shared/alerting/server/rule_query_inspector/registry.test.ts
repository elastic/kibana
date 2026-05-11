/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleQueryInspectorRegistry } from './registry';
import type { RuleQueryInspectorHandler } from './types';

describe('RuleQueryInspectorRegistry', () => {
  const mockHandler: RuleQueryInspectorHandler = jest.fn();
  let registry: RuleQueryInspectorRegistry;

  beforeEach(() => {
    registry = new RuleQueryInspectorRegistry();
  });

  describe('register', () => {
    it('registers a handler for a rule type', () => {
      registry.register('test.rule-type', mockHandler);
      expect(registry.get('test.rule-type')).toBe(mockHandler);
    });

    it('throws if a handler for the same rule type is already registered', () => {
      registry.register('test.rule-type', mockHandler);

      expect(() =>
        registry.register('test.rule-type', mockHandler)
      ).toThrowErrorMatchingInlineSnapshot(
        `"Rule query inspector handler for rule type \\"test.rule-type\\" is already registered"`
      );
    });
  });

  describe('get', () => {
    it('returns the handler for a registered rule type', () => {
      registry.register('test.rule-type', mockHandler);
      expect(registry.get('test.rule-type')).toBe(mockHandler);
    });

    it('returns undefined for an unregistered rule type', () => {
      expect(registry.get('not.registered')).toBeUndefined();
    });
  });
});
