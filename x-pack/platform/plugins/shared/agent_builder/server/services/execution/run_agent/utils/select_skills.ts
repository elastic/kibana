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
 * - Built-in skills when `enable_elastic_capabilities` is true, excluding any
 *   marked `excludeFromElasticCapabilities` (those remain reachable via `skill_ids`)
 * - Additional skills from assigned plugins via `additionalSkillIds`
 * - When `isSkillIdsOverrideActive` is true, built-ins are restricted to those
 *   marked `includeWithSkillOverride` so the override acts as a strict filter.
 *
 * Returns the merged, deduplicated list.
 */
export const resolveAgentSkills = async ({
  skills,
  agentConfiguration,
  additionalSkillIds,
  isSkillIdsOverrideActive = false,
}: {
  // Allows SkillRegistry to be passed as well
  skills: Pick<SkillsService, 'bulkGet' | 'list'>;
  agentConfiguration: AgentConfiguration;
  additionalSkillIds?: string[];
  /**
   * When true, `skill_ids` was explicitly overridden at runtime. Built-in skills
   * are restricted to those marked `includeWithSkillOverride` instead of the full
   * `enable_elastic_capabilities` pool, so the override acts as a strict filter.
   */
  isSkillIdsOverrideActive?: boolean;
}): Promise<InternalSkillDefinition[]> => {
  const skillIds = agentConfiguration.skill_ids ?? [];
  const enableElasticCapabilities = agentConfiguration.enable_elastic_capabilities ?? false;
  const pluginSkillIds = additionalSkillIds ?? [];

  if (skillIds.length === 0 && !enableElasticCapabilities && pluginSkillIds.length === 0) {
    return [];
  }

  const allExplicitIds = [...skillIds, ...pluginSkillIds];

  const [explicitSkillsMap, builtinSkills] = await Promise.all([
    allExplicitIds.length > 0
      ? skills.bulkGet(allExplicitIds)
      : Promise.resolve(new Map<string, InternalSkillDefinition>()),
    enableElasticCapabilities || isSkillIdsOverrideActive
      ? skills.list({ type: 'built-in' })
      : Promise.resolve([] as InternalSkillDefinition[]),
  ]);

  const merged = new Map(explicitSkillsMap);
  for (const skill of builtinSkills) {
    if (merged.has(skill.id)) continue;

    // using explicit runtime override list
    if (isSkillIdsOverrideActive) {
      if (skill.includeWithSkillOverride) {
        // Always include platform skills that opt in regardless of overrides.
        merged.set(skill.id, skill);
      } else if (
        enableElasticCapabilities &&
        !skill.excludeFromElasticCapabilities &&
        skillIds.includes(skill.id)
      ) {
        // When the agent has elastic capabilities enabled, its built-in skill pool is still
        // available — the override can name any of those skills to narrow to a subset.
        merged.set(skill.id, skill);
      }
    } else if (!skill.excludeFromElasticCapabilities) {
      merged.set(skill.id, skill);
    }
  }

  return [...merged.values()];
};

/**
 * Resolves agent skills and populates the writable skills store.
 */
export const selectSkills = async ({
  skills,
  skillsStore,
  agentConfiguration,
  additionalSkillIds,
  isSkillIdsOverrideActive,
}: {
  skills: SkillsService;
  skillsStore: WritableSkillsStore;
  agentConfiguration: AgentConfiguration;
  additionalSkillIds?: string[];
  isSkillIdsOverrideActive?: boolean;
}): Promise<InternalSkillDefinition[]> => {
  const agentSkills = await resolveAgentSkills({
    skills,
    agentConfiguration,
    additionalSkillIds,
    isSkillIdsOverrideActive,
  });
  for (const skill of agentSkills) {
    skillsStore.add(skill);
  }
  return agentSkills;
};
