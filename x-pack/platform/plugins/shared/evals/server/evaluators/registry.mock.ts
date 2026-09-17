/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluatorDefinition, EvaluatorRegistry } from './types';

/**
 * A registry resolving only the definitions it is given, for tests of routes
 * that take one but do not exercise it.
 */
export const createEvaluatorRegistryMock = (
  definitions: EvaluatorDefinition[] = []
): EvaluatorRegistry => {
  const byName = new Map(definitions.map((definition) => [definition.name, definition]));

  return {
    isBuiltIn: (name) => byName.get(name)?.origin === 'built_in',
    asScoped: () => ({
      list: async () => definitions,
      get: async (name, version) => {
        const definition = byName.get(name);
        return !definition || (version && definition.version !== version) ? undefined : definition;
      },
    }),
  };
};
