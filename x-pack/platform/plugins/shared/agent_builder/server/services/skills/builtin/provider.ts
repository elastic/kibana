/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { ReadonlySkillProvider } from '../skill_provider';
import { convertBuiltinSkill } from './converter';

export const createBuiltinSkillProvider = (skills: SkillDefinition[]): ReadonlySkillProvider => {
  const skillsMap = new Map(skills.map((s) => [s.id, s]));

  return {
    id: 'builtin',
    readonly: true,
    has: (skillId) => skillsMap.has(skillId),
    get: (skillId) => {
      const skill = skillsMap.get(skillId);
      return skill ? convertBuiltinSkill(skill) : undefined;
    },
    list: () => [...skillsMap.values()].map(convertBuiltinSkill),
  };
};
