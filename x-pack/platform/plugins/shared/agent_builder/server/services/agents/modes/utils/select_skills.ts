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
 * Resolves the set of skills available to an agent based on its configuration:
 * - Explicitly selected skills via `skill_ids` (fetched with bulkGet)
 * - All built-in skills when `enable_elastic_capabilities` is true
 * - Additional skills from assigned plugins via `additionalSkillIds`
 *
 * Populates the writable skills store and returns the merged list.
 */
export const selectSkills = async ({
  skills,
  skillsStore,
  agentConfiguration,
  additionalSkillIds,
}: {
  skills: SkillsService;
  skillsStore: WritableSkillsStore;
  agentConfiguration: AgentConfiguration;
  additionalSkillIds?: string[];
}): Promise<InternalSkillDefinition[]> => {
  const skillIds = agentConfiguration.skill_ids ?? [];
  const enableElasticCapabilities = agentConfiguration.enable_elastic_capabilities ?? false;
  const pluginSkillIds = additionalSkillIds ?? [];

  if (skillIds.length === 0 && !enableElasticCapabilities && pluginSkillIds.length === 0) {
    return [];
  }

  const [selectedSkillsMap, builtinSkills, pluginSkillsMap] = await Promise.all([
    skillIds.length > 0
      ? skills.bulkGet(skillIds)
      : Promise.resolve(new Map<string, InternalSkillDefinition>()),
    enableElasticCapabilities
      ? skills.list({ type: 'built-in' })
      : Promise.resolve([] as InternalSkillDefinition[]),
    pluginSkillIds.length > 0
      ? skills.bulkGet(pluginSkillIds)
      : Promise.resolve(new Map<string, InternalSkillDefinition>()),
  ]);

  const merged = new Map(selectedSkillsMap);
  for (const skill of builtinSkills) {
    if (!merged.has(skill.id)) {
      merged.set(skill.id, skill);
    }
  }
  for (const [id, skill] of pluginSkillsMap) {
    if (!merged.has(id)) {
      merged.set(id, skill);
    }
  }

  const result = [...merged.values()];
  for (const skill of result) {
    skillsStore.add(skill);
  }
  return result;
};
