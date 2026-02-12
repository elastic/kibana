/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillsStore, WritableSkillsStore } from '@kbn/agent-builder-server/runner';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { MemoryVolume } from '../../filesystem';
import { createSkillEntries, getSkillEntryPath } from './utils';

export const createSkillsStore = ({ skills }: { skills: SkillDefinition[] }) => {
  return new SkillsStoreImpl({ skills });
};

export class SkillsStoreImpl implements WritableSkillsStore {
  private readonly skills: Map<string, SkillDefinition> = new Map();
  private readonly volume: MemoryVolume;

  constructor({ skills = [] }: { skills?: SkillDefinition[] }) {
    this.volume = new MemoryVolume('skills');
    skills.forEach((skill) => this.add(skill));
  }

  getVolume() {
    return this.volume;
  }

  add(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill);
    // Also add to the volume for filesystem access
    const entries = createSkillEntries(skill);
    entries.forEach((entry) => this.volume.add(entry));
  }

  /**
   * Delete a skill from the store and the volume. Currently unused.
   * @param skillId - The id of the skill to delete
   * @returns
   */
  delete(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (skill) {
      const path = getSkillEntryPath({
        skill,
      });
      this.volume.remove(path);
    }
    return this.skills.delete(skillId);
  }

  has(skillId: string): boolean {
    return this.skills.has(skillId);
  }

  get(skillId: string): SkillDefinition {
    if (!this.skills.has(skillId)) {
      throw new Error(`Skill with id ${skillId} does not exist`);
    }
    return this.skills.get(skillId)!;
  }

  asReadonly(): SkillsStore {
    return {
      has: (skillId) => this.has(skillId),
      get: (skillId) => this.get(skillId),
    };
  }
}
