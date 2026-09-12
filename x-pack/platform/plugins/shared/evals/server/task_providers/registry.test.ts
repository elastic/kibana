/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTaskProviderRegistry } from './registry';
import { BUILT_IN_TASK_PROVIDERS } from './types';
import type { EvalsTaskProvider } from './types';

const noopProvider = (name: string): EvalsTaskProvider => ({
  name,
  run: async () => ({ output: {} }),
});

describe('createTaskProviderRegistry', () => {
  it('seeds the built-in providers', () => {
    const registry = createTaskProviderRegistry();
    const names = registry.list().map((provider) => provider.name);
    expect(names).toEqual(
      expect.arrayContaining([
        BUILT_IN_TASK_PROVIDERS.inference,
        BUILT_IN_TASK_PROVIDERS.agentBuilderConverse,
      ])
    );
    expect(registry.has(BUILT_IN_TASK_PROVIDERS.inference)).toBe(true);
  });

  it('registers and resolves a custom provider', () => {
    const registry = createTaskProviderRegistry();
    registry.register(noopProvider('sigEvents.identify'));
    expect(registry.get('sigEvents.identify')?.name).toBe('sigEvents.identify');
  });

  it('throws when registering a duplicate provider name', () => {
    const registry = createTaskProviderRegistry();
    expect(() => registry.register(noopProvider(BUILT_IN_TASK_PROVIDERS.inference))).toThrow(
      /already registered/
    );
  });

  it('returns undefined for unknown providers', () => {
    const registry = createTaskProviderRegistry();
    expect(registry.get('does-not-exist')).toBeUndefined();
    expect(registry.has('does-not-exist')).toBe(false);
  });
});
