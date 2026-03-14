/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillsService, WritableSkillsStore } from '@kbn/agent-builder-server/runner';

/**
 * Fetches skills matching the agent's `skill_ids` configuration via bulkGet,
 * populates the writable skills store so that the skills volume in the virtual
 * filesystem reflects only the selected skills, and returns the resolved list
 * for downstream use (e.g. tool selection).
 *
 * When `skill_ids` is undefined or empty, no skills are loaded.
 */
export const selectSkills = async ({
  skills,
  skillsStore,
  agentConfiguration,
}: {
  skills: SkillsService;
  skillsStore: WritableSkillsStore;
  agentConfiguration: AgentConfiguration;
}): Promise<InternalSkillDefinition[]> => {
  const skillIds = agentConfiguration.skill_ids ?? [];
  if (skillIds.length === 0) {
    return [];
  }

  const filteredSkills = [...(await skills.bulkGet(skillIds)).values()];
  for (const skill of filteredSkills) {
    skillsStore.add(skill);
  }
  return filteredSkills;
};
