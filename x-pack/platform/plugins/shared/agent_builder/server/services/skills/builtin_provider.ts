/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillRegistry } from './skill_registry';
import type { ReadonlySkillProvider } from './skill_provider';

/**
 * Wraps the existing in-memory SkillRegistry as a ReadonlySkillProvider,
 * mirroring the pattern used by the built-in tool provider.
 */
export const createBuiltinSkillProvider = ({
  registry,
}: {
  registry: SkillRegistry;
}): ReadonlySkillProvider => {
  return {
    id: 'builtin',
    readonly: true,

    has(skillId: string) {
      return registry.has(skillId);
    },

    get(skillId: string) {
      return registry.get(skillId);
    },

    list() {
      return registry.list();
    },
  };
};
