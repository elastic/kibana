/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillProvider } from './skill_registry';
import type { SkillClient } from './client';
import { persistedSkillToPublicDefinition } from './utils';

export const createPersistedProvider = (skillClient: SkillClient): SkillProvider => ({
  id: 'persisted',
  async has(skillId: string) {
    return skillClient.has(skillId);
  },
  async get(skillId: string) {
    try {
      const skill = await skillClient.get(skillId);
      return persistedSkillToPublicDefinition(skill);
    } catch {
      return undefined;
    }
  },
  async list() {
    const skills = await skillClient.list();
    return skills.map(persistedSkillToPublicDefinition);
  },
  async create(createRequest) {
    const skill = await skillClient.create(createRequest);
    return persistedSkillToPublicDefinition(skill);
  },
  async update(skillId, updateRequest) {
    const skill = await skillClient.update(skillId, updateRequest);
    return persistedSkillToPublicDefinition(skill);
  },
  async delete(skillId: string) {
    return skillClient.delete(skillId);
  },
});
