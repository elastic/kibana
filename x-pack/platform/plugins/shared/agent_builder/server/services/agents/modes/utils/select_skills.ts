/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillsService, WritableSkillsStore } from '@kbn/agent-builder-server/runner';
import { filterSkillsBySelection } from '../../../runner/store/create_store';

/**
 * Fetches all available skills, filters them according to the agent's
 * `skill_ids` configuration, and populates the writable skills store
 * so that the skills volume in the virtual filesystem reflects only
 * the selected skills.
 *
 * Returns the filtered list for downstream use (e.g. tool selection).
 */
export const selectAndEnableSkills = async ({
  skills,
  skillsStore,
  agentConfiguration,
}: {
  skills: SkillsService;
  skillsStore: WritableSkillsStore;
  agentConfiguration: AgentConfiguration;
}): Promise<InternalSkillDefinition[]> => {
  const allSkills = await skills.list();
  const filteredSkills = filterSkillsBySelection(allSkills, agentConfiguration.skill_ids);
  for (const skill of filteredSkills) {
    skillsStore.add(skill);
  }
  return filteredSkills;
};
