/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlTypeDefinition } from './types';
import { createSmlTypeRegistry, type SmlTypeRegistry } from './sml_type_registry';

const createMockSmlTypeDefinition = (
  overrides: Partial<SmlTypeDefinition> = {}
): SmlTypeDefinition => ({
  id: 'test-type',
  list: jest.fn(),
  getSmlData: jest.fn(),
  toAttachment: jest.fn(),
  ...overrides,
});

describe('createSmlTypeRegistry', () => {
  let registry: SmlTypeRegistry;

  beforeEach(() => {
    registry = createSmlTypeRegistry();
  });

  describe('register', () => {
    it('registers a type and stores it correctly', () => {
      const def = createMockSmlTypeDefinition({ id: 'dashboard' });
      registry.register(def);
      expect(registry.has('dashboard')).toBe(true);
      expect(registry.get('dashboard')).toBe(def);
      expect(registry.list()).toEqual([def]);
    });

    it('throws on duplicate id', () => {
      const def = createMockSmlTypeDefinition({ id: 'lens' });
      registry.register(def);
      const duplicate = createMockSmlTypeDefinition({ id: 'lens' });
      expect(() => registry.register(duplicate)).toThrow(
        "SML type with id 'lens' is already registered"
      );
    });

    it.each(['', 'Has-Uppercase', '123-starts-with-number', 'has spaces', 'special!chars'])(
      'throws on invalid id: %s',
      (invalidId) => {
        const def = createMockSmlTypeDefinition({ id: invalidId });
        expect(() => registry.register(def)).toThrow(/Invalid SML type id/);
      }
    );

    it.each(['dashboard', 'my-type', 'lens_v2', 'a123'])('accepts valid id: %s', (validId) => {
      const def = createMockSmlTypeDefinition({ id: validId });
      expect(() => registry.register(def)).not.toThrow();
    });
  });

  describe('has', () => {
    it('returns true for registered type', () => {
      const def = createMockSmlTypeDefinition({ id: 'esql' });
      registry.register(def);
      expect(registry.has('esql')).toBe(true);
    });

    it('returns false for unregistered type', () => {
      expect(registry.has('unregistered')).toBe(false);
      const def = createMockSmlTypeDefinition({ id: 'dashboard' });
      registry.register(def);
      expect(registry.has('unregistered')).toBe(false);
    });
  });

  describe('get', () => {
    it('returns the definition for registered type', () => {
      const def = createMockSmlTypeDefinition({ id: 'dashboard' });
      registry.register(def);
      expect(registry.get('dashboard')).toBe(def);
    });

    it('returns undefined for unregistered type', () => {
      expect(registry.get('unregistered')).toBeUndefined();
      const def = createMockSmlTypeDefinition({ id: 'lens' });
      registry.register(def);
      expect(registry.get('unregistered')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('returns empty array when no types are registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('returns all registered types', () => {
      const def1 = createMockSmlTypeDefinition({ id: 'dashboard' });
      const def2 = createMockSmlTypeDefinition({ id: 'lens' });
      const def3 = createMockSmlTypeDefinition({ id: 'esql' });
      registry.register(def1);
      registry.register(def2);
      registry.register(def3);
      expect(registry.list()).toEqual([def1, def2, def3]);
    });
  });
});
