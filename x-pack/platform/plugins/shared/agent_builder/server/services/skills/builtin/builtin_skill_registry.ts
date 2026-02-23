/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSkillId } from '@kbn/agent-builder-common/skills';
import type { Skill } from '@kbn/agent-builder-common/skills';

export interface BuiltinSkillRegistry {
  register(skill: Skill): void;
  has(skillId: string): boolean;
  get(skillId: string): Skill | undefined;
  list(): Skill[];
}

export const createBuiltinSkillRegistry = (): BuiltinSkillRegistry => {
  return new BuiltinSkillRegistryImpl();
};

class BuiltinSkillRegistryImpl implements BuiltinSkillRegistry {
  private skills: Map<string, Skill> = new Map();

  constructor() {}

  register(skill: Skill) {
    if (this.skills.has(skill.namespace)) {
      throw new Error(`Skill with id ${skill.namespace} already registered`);
    }
    const errorMessage = validateSkillId({ skillId: skill.namespace, builtIn: true });
    if (errorMessage) {
      throw new Error(`Invalid skill id: "${skill.namespace}": ${errorMessage}`);
    }
    if (skill.description.length > 120) {
      throw new Error(
        `Skill description must be 120 characters or less. ` +
          `Got ${skill.description.length} characters for skill "${skill.namespace}".`
      );
    }
    this.skills.set(skill.namespace, skill);
  }

  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  get(skillId: string) {
    return this.skills.get(skillId);
  }

  list() {
    return [...this.skills.values()];
  }
}

