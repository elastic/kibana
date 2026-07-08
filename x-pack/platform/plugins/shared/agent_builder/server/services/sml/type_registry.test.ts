/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSmlTypeRegistry } from './type_registry';
import type { SmlTypeDefinition } from '@kbn/agent-builder-server';

const makeType = (id: string): SmlTypeDefinition => ({
  id,
  async *list() {
    yield [];
  },
  getSmlData: async () => undefined,
  toAttachment: async () => undefined,
});

describe('createSmlTypeRegistry', () => {
  it('registers and retrieves a type', () => {
    const registry = createSmlTypeRegistry();
    registry.register(makeType('widget'));
    expect(registry.get('widget')?.id).toBe('widget');
    expect(registry.has('widget')).toBe(true);
  });

  it('rejects invalid type ids', () => {
    const registry = createSmlTypeRegistry();
    expect(() => registry.register(makeType('Widget'))).toThrow(/Invalid SML type id/);
  });

  it('rejects duplicate registration', () => {
    const registry = createSmlTypeRegistry();
    registry.register(makeType('widget'));
    expect(() => registry.register(makeType('widget'))).toThrow(/already registered/);
  });

  it('lists all registered types', () => {
    const registry = createSmlTypeRegistry();
    registry.register(makeType('a'));
    registry.register(makeType('b'));
    expect(
      registry
        .list()
        .map((t) => t.id)
        .sort()
    ).toEqual(['a', 'b']);
  });
});
