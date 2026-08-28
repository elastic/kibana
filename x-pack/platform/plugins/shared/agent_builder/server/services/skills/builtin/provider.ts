/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalSkillDefinition, SkillDefinition } from '@kbn/agent-builder-server/skills';
import type { AvailabilityCache } from '../../common/availability_cache';
import type { ReadonlySkillProvider } from '../skill_provider';
import type { SkillListOptions } from '../persisted/client';
import { convertBuiltinSkill } from './converter';

export const createBuiltinSkillProvider = (
  skills: SkillDefinition[],
  cache: AvailabilityCache
): ReadonlySkillProvider => {
  const skillsMap = new Map(skills.map((s) => [s.id, s]));
  const convert = (skill: SkillDefinition) => convertBuiltinSkill({ skill, cache });

  return {
    id: 'builtin',
    readonly: true,
    has: (skillId) => skillsMap.has(skillId),
    get: (skillId) => {
      const skill = skillsMap.get(skillId);
      return skill ? convert(skill) : undefined;
    },
    bulkGet: (ids) => {
      const result = new Map<string, InternalSkillDefinition>();
      for (const id of ids) {
        const skill = skillsMap.get(id);
        if (skill) {
          result.set(id, convert(skill));
        }
      }
      return result;
    },
    list: (options?: SkillListOptions) => {
      const converted = [...skillsMap.values()].map(convert);
      if (options?.summaryOnly) {
        return converted.map((s) => ({
          ...s,
          content: '',
          referencedContentCount: s.referencedContent?.length ?? 0,
          referencedContent: [],
        }));
      }
      return converted;
    },
  };
};
