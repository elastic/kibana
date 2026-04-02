/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { EvaluatorRegistry } from '../evaluator_registry';
import type { ServerEvaluator } from '../evaluator_registry';

const createMockEvaluator = (overrides: Partial<ServerEvaluator> = {}): ServerEvaluator => ({
  name: 'test-evaluator',
  kind: 'CODE',
  description: 'A test evaluator',
  source: 'prebuilt',
  evaluate: jest.fn().mockResolvedValue({
    evaluator: 'test-evaluator',
    kind: 'CODE',
    score: 1.0,
    label: 'pass',
  }),
  ...overrides,
});

describe('EvaluatorRegistry', () => {
  const logger = loggingSystemMock.createLogger();
  let registry: EvaluatorRegistry;

  beforeEach(() => {
    registry = new EvaluatorRegistry(logger);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('registers an evaluator', () => {
      const evaluator = createMockEvaluator();
      registry.register(evaluator);

      expect(registry.has('test-evaluator')).toBe(true);
      expect(logger.debug).toHaveBeenCalledWith(
        'Registered evaluator: test-evaluator (CODE, prebuilt)'
      );
    });

    it('overwrites an existing evaluator with a warning', () => {
      const evaluator1 = createMockEvaluator({ description: 'first' });
      const evaluator2 = createMockEvaluator({ description: 'second' });

      registry.register(evaluator1);
      registry.register(evaluator2);

      expect(registry.get('test-evaluator')?.description).toBe('second');
      expect(logger.warn).toHaveBeenCalledWith(
        'Evaluator "test-evaluator" already registered, overwriting'
      );
    });
  });

  describe('get', () => {
    it('returns the evaluator when it exists', () => {
      const evaluator = createMockEvaluator();
      registry.register(evaluator);

      expect(registry.get('test-evaluator')).toBe(evaluator);
    });

    it('returns undefined when the evaluator does not exist', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all registered evaluators', () => {
      registry.register(createMockEvaluator({ name: 'eval-a' }));
      registry.register(createMockEvaluator({ name: 'eval-b' }));

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map((e) => e.name)).toEqual(['eval-a', 'eval-b']);
    });

    it('returns empty array when no evaluators are registered', () => {
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('has', () => {
    it('returns true for registered evaluators', () => {
      registry.register(createMockEvaluator());
      expect(registry.has('test-evaluator')).toBe(true);
    });

    it('returns false for unregistered evaluators', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes a registered evaluator', () => {
      registry.register(createMockEvaluator());
      expect(registry.remove('test-evaluator')).toBe(true);
      expect(registry.has('test-evaluator')).toBe(false);
    });

    it('returns false when evaluator does not exist', () => {
      expect(registry.remove('nonexistent')).toBe(false);
    });
  });

  describe('getNames', () => {
    it('returns all evaluator names', () => {
      registry.register(createMockEvaluator({ name: 'alpha' }));
      registry.register(createMockEvaluator({ name: 'beta' }));

      expect(registry.getNames()).toEqual(['alpha', 'beta']);
    });
  });
});
