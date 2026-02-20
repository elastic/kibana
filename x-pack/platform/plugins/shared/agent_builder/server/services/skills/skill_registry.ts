/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { validateSkillDefinition } from '@kbn/agent-builder-server/skills';
import { getSkillEntryPath } from '../runner/store/volumes/skills/utils';

export interface SkillRegistry {
  register(skill: SkillDefinition): Promise<void>;
  unregister(skillId: string): Promise<boolean>;
  has(skillId: string): boolean;
  get(skillId: string): SkillDefinition | undefined;
  list(): SkillDefinition[];
}

export const createSkillRegistry = (): SkillRegistry => {
  return new SkillRegistryImpl();
};

class SkillRegistryImpl implements SkillRegistry {
  private skills: Map<string, SkillDefinition> = new Map();
  private skillFullPaths: Set<string> = new Set();

  async register(skill: SkillDefinition) {
    await validateSkillDefinition(skill);

    if (this.skills.has(skill.id)) {
      throw new Error(`Skill type with id ${skill.id} already registered`);
    }

    const fullPath = getSkillEntryPath({
      skill,
    });

    if (this.skillFullPaths.has(fullPath)) {
      throw new Error(
        `Skill with path ${skill.basePath} and name ${skill.name} already registered`
      );
    }
    this.skillFullPaths.add(fullPath);

    this.skills.set(skill.id, skill);
  }

  async unregister(skillId: string): Promise<boolean> {
    const skill = this.skills.get(skillId);
    if (!skill) {
      return false;
    }

    const fullPath = getSkillEntryPath({ skill });
    this.skillFullPaths.delete(fullPath);
    this.skills.delete(skillId);
    return true;
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
