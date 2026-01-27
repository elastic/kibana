/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SkillProvider } from '@kbn/agent-builder-server';
import type { SkillsServiceStart } from '../types';
import { createBadRequestError } from '@kbn/agent-builder-common';

export const serviceToProvider = ({
  skillsService,
  request,
}: {
  skillsService: SkillsServiceStart;
  request: KibanaRequest;
}): SkillProvider => {
  return {
    has: async ({ skillId }) => {
      const skills = skillsService.getAllSkills();
      return skills.some((skill) => skill.namespace === skillId);
    },
    get: async ({ skillId }) => {
      const skills = skillsService.getAllSkills();
      const skill = skills.find((s) => s.namespace === skillId);
      if (!skill) {
        throw createBadRequestError(`Skill ${skillId} not found`, { skillId, statusCode: 404 });
      }
      return skill;
    },
    list: async () => {
      return skillsService.getAllSkills();
    },
  };
};

