/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSmlResolverRegistry } from './resolver_registry';
import type { SmlResolver } from './types';

const buildMockResolver = (type: string): SmlResolver => ({
  type,
  getPermissions: () => [],
  getItem: async () => undefined,
});

describe('createSmlResolverRegistry', () => {
  it('registers and retrieves a resolver by type', () => {
    const registry = createSmlResolverRegistry();
    const resolver = buildMockResolver('kibana');
    registry.register(resolver);

    expect(registry.has('kibana')).toBe(true);
    expect(registry.get('kibana')).toBe(resolver);
  });

  it('returns undefined / false for an unknown resolver type', () => {
    const registry = createSmlResolverRegistry();
    expect(registry.get('kibana')).toBeUndefined();
    expect(registry.has('kibana')).toBe(false);
  });

  it('throws when registering a duplicate resolver type', () => {
    const registry = createSmlResolverRegistry();
    registry.register(buildMockResolver('kibana'));
    expect(() => registry.register(buildMockResolver('kibana'))).toThrow(/already registered/);
  });

  it('rejects resolver types that violate the naming pattern', () => {
    const registry = createSmlResolverRegistry();
    expect(() => registry.register(buildMockResolver('Kibana'))).toThrow(
      /Invalid SML resolver type/
    );
    expect(() => registry.register(buildMockResolver('1bad'))).toThrow(/Invalid SML resolver type/);
    expect(() => registry.register(buildMockResolver(''))).toThrow(/Invalid SML resolver type/);
  });

  it('accepts type ids with underscores and hyphens', () => {
    const registry = createSmlResolverRegistry();
    registry.register(buildMockResolver('es_document'));
    registry.register(buildMockResolver('foo-bar'));
    expect(registry.has('es_document')).toBe(true);
    expect(registry.has('foo-bar')).toBe(true);
  });

  it('list returns all registered resolvers in registration order', () => {
    const registry = createSmlResolverRegistry();
    const a = buildMockResolver('a');
    const b = buildMockResolver('b');
    const c = buildMockResolver('c');
    registry.register(a);
    registry.register(b);
    registry.register(c);
    expect(registry.list()).toEqual([a, b, c]);
  });
});
