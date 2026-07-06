/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContextEngineTypeDefinition } from './types';
import { createContextEngineTypeRegistry, type ContextEngineTypeRegistry } from './type_registry';

const createMockContextEngineTypeDefinition = (
  overrides: Partial<ContextEngineTypeDefinition> = {}
): ContextEngineTypeDefinition => ({
  id: 'test-type',
  list: jest.fn(),
  getContextEngineData: jest.fn(),
  toAttachment: jest.fn(),
  ...overrides,
});

describe('createContextEngineTypeRegistry', () => {
  let registry: ContextEngineTypeRegistry;

  beforeEach(() => {
    registry = createContextEngineTypeRegistry();
  });

  describe('register', () => {
    it('registers a type and stores it correctly', () => {
      const def = createMockContextEngineTypeDefinition({ id: 'dashboard' });
      registry.register(def);
      expect(registry.has('dashboard')).toBe(true);
      expect(registry.get('dashboard')).toBe(def);
      expect(registry.list()).toEqual([def]);
    });

    it('throws on duplicate id', () => {
      const def = createMockContextEngineTypeDefinition({ id: 'lens' });
      registry.register(def);
      const duplicate = createMockContextEngineTypeDefinition({ id: 'lens' });
      expect(() => registry.register(duplicate)).toThrow(
        "Context Engine type with id 'lens' is already registered"
      );
    });

    it.each(['', 'Has-Uppercase', '123-starts-with-number', 'has spaces', 'special!chars'])(
      'throws on invalid id: %s',
      (invalidId) => {
        const def = createMockContextEngineTypeDefinition({ id: invalidId });
        expect(() => registry.register(def)).toThrow(/Invalid Context Engine type id/);
      }
    );

    it.each(['dashboard', 'my-type', 'lens_v2', 'a123'])('accepts valid id: %s', (validId) => {
      const def = createMockContextEngineTypeDefinition({ id: validId });
      expect(() => registry.register(def)).not.toThrow();
    });
  });

  describe('has', () => {
    it('returns true for registered type', () => {
      const def = createMockContextEngineTypeDefinition({ id: 'esql' });
      registry.register(def);
      expect(registry.has('esql')).toBe(true);
    });

    it('returns false for unregistered type', () => {
      expect(registry.has('unregistered')).toBe(false);
      const def = createMockContextEngineTypeDefinition({ id: 'dashboard' });
      registry.register(def);
      expect(registry.has('unregistered')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns the definition for registered type', () => {
      const def = createMockContextEngineTypeDefinition({ id: 'dashboard' });
      registry.register(def);
      expect(registry.get('dashboard')).toBe(def);
    });

    it('returns undefined for unregistered type', () => {
      expect(registry.get('unregistered')).toBeUndefined();
      const def = createMockContextEngineTypeDefinition({ id: 'lens' });
      registry.register(def);
      expect(registry.get('unregistered')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns empty array when no types are registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('returns all registered types', () => {
      const def1 = createMockContextEngineTypeDefinition({ id: 'dashboard' });
      const def2 = createMockContextEngineTypeDefinition({ id: 'lens' });
      const def3 = createMockContextEngineTypeDefinition({ id: 'esql' });
      registry.register(def1);
      registry.register(def2);
      registry.register(def3);
      expect(registry.list()).toEqual([def1, def2, def3]);
    });
  });
});
