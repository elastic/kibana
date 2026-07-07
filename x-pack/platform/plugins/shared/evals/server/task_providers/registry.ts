/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsTaskProvider, TaskProviderRegistry } from './types';
import { createBuiltInTaskProviders } from './builtin';

/**
 * Creates the in-memory task provider registry and seeds it with the built-in
 * providers (`inference`, `agentBuilder.converse`, `agentBuilder.tool`). Other
 * plugins register their real suite task functions via the plugin setup contract
 * (`registerTaskProvider`).
 */
export const createTaskProviderRegistry = (): TaskProviderRegistry => {
  const providers = new Map<string, EvalsTaskProvider>();

  const register = (provider: EvalsTaskProvider): void => {
    if (providers.has(provider.name)) {
      throw new Error(`Task provider "${provider.name}" is already registered`);
    }
    providers.set(provider.name, provider);
  };

  for (const provider of createBuiltInTaskProviders()) {
    register(provider);
  }

  return {
    register,
    get: (name) => providers.get(name),
    has: (name) => providers.has(name),
    list: () => [...providers.values()],
  };
};
