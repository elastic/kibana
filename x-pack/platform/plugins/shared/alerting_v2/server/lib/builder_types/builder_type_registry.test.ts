/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuilderTypeRegistry } from './builder_type_registry';
import { registerBuiltinBuilderTypes } from './register_builtin_builder_types';

describe('BuilderTypeRegistry', () => {
  it('rejects an empty type and a duplicate registration', () => {
    const registry = new BuilderTypeRegistry();
    expect(() => registry.register({ type: ' ' })).toThrow(/non-empty/);

    registry.register({ type: '  custom  ' });
    expect(registry.get('custom')).toEqual({ type: 'custom' });
    expect(registry.get('  custom  ')).toEqual({ type: 'custom' });
    expect(() => registry.register({ type: 'custom' })).toThrow(/already registered/);

    registerBuiltinBuilderTypes(registry);
    expect(registry.get('threshold')?.type).toBe('threshold');
    expect(registry.get('sequence')?.type).toBe('sequence');
    expect(() => registry.register({ type: ' threshold ' })).toThrow(/already registered/);
    expect(() => registerBuiltinBuilderTypes(registry)).toThrow(/already registered/);
  });
});
