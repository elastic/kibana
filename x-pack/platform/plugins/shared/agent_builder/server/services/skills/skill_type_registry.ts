/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillTypeDefinition } from '@kbn/agent-builder-server/skills';

export interface SkillTypeRegistry {
  register(skill: SkillTypeDefinition): void;
  has(skillId: string): boolean;
  get(skillId: string): SkillTypeDefinition | undefined;
  list(): SkillTypeDefinition[];
}

export const createSkillTypeRegistry = (): SkillTypeRegistry => {
  return new SkillTypeRegistryImpl();
};

class SkillTypeRegistryImpl implements SkillTypeRegistry {
  private skills: Map<string, SkillTypeDefinition> = new Map();
  private skillFullPaths: Set<string> = new Set();

  constructor() {}

  register(skill: SkillTypeDefinition) {
    if (this.skills.has(skill.id)) {
      throw new Error(`Skill type with id ${skill.id} already registered`);
    }

    const fullPath = `${skill.path}:${skill.name}`;

    if (this.skillFullPaths.has(fullPath)) {
      throw new Error(`Skill with path ${skill.path} and name ${skill.name} already registered`);
    }
    this.skillFullPaths.add(fullPath);

    this.skills.set(skill.id, skill);
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

