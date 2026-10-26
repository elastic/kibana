/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/agent-builder-common';
import { kiRetrievalSkillId } from '@kbn/agent-builder-common';
import type { InternalSkillDefinition } from '@kbn/agent-builder-server/skills';
import type { SkillsService, WritableSkillsStore } from '@kbn/agent-builder-server/runner';

interface BuiltInCapabilitySkillRule {
  skillId: string;
  applies: (agentConfiguration: AgentConfiguration) => boolean;
}

/**
 * Skills granted at runtime, outside the agent's configuration. They should be `hidden`;
 * each skill's own `availability` still applies when it is fetched.
 */
const builtInCapabilitySkillRules: BuiltInCapabilitySkillRule[] = [
  {
    // Context Engine retrieval: the agent can reach at least one AI Index. The skill itself is
    // unavailable in spaces where `contextEngine:enabled` is off.
    skillId: kiRetrievalSkillId,
    applies: ({ ai_indices: aiIndices }) => (aiIndices?.length ?? 0) > 0,
  },
];

const getBuiltInCapabilitySkillIds = (agentConfiguration: AgentConfiguration): string[] =>
  builtInCapabilitySkillRules
    .filter(({ applies }) => applies(agentConfiguration))
    .map(({ skillId }) => skillId);

/**
 * Resolves the set of skills available to an agent based on its configuration:
 * - Explicitly selected skills via `skill_ids` (fetched with bulkGet)
 * - Built-in skills when `enable_elastic_capabilities` is true, excluding any
 *   marked `excludeFromElasticCapabilities` (those remain reachable via `skill_ids`)
 * - Additional skills from assigned plugins via `additionalSkillIds`
 * - Built-in capability skills granted for this run via `builtInCapabilitySkillIds`
 *
 * Returns the merged, deduplicated list.
 */
export const resolveAgentSkills = async ({
  skills,
  agentConfiguration,
  additionalSkillIds,
  builtInCapabilitySkillIds,
}: {
  // Allows SkillRegistry to be passed as well
  skills: Pick<SkillsService, 'bulkGet' | 'list'>;
  agentConfiguration: AgentConfiguration;
  additionalSkillIds?: string[];
  builtInCapabilitySkillIds?: string[];
}): Promise<InternalSkillDefinition[]> => {
  const skillIds = agentConfiguration.skill_ids ?? [];
  const enableElasticCapabilities = agentConfiguration.enable_elastic_capabilities ?? false;
  const pluginSkillIds = additionalSkillIds ?? [];
  const capabilitySkillIds = builtInCapabilitySkillIds ?? [];

  const allExplicitIds = [...new Set([...skillIds, ...pluginSkillIds, ...capabilitySkillIds])];

  if (allExplicitIds.length === 0 && !enableElasticCapabilities) {
    return [];
  }

  const [explicitSkillsMap, builtinSkills] = await Promise.all([
    allExplicitIds.length > 0
      ? skills.bulkGet(allExplicitIds)
      : Promise.resolve(new Map<string, InternalSkillDefinition>()),
    enableElasticCapabilities
      ? skills.list({ type: 'built-in' })
      : Promise.resolve([] as InternalSkillDefinition[]),
  ]);

  const merged = new Map(explicitSkillsMap);
  for (const skill of builtinSkills) {
    if (!skill.excludeFromElasticCapabilities && !merged.has(skill.id)) {
      merged.set(skill.id, skill);
    }
  }

  return [...merged.values()];
};

/**
 * Resolves agent skills, including the built-in capability skills that apply to this run, and
 * populates the writable skills store.
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
  const agentSkills = await resolveAgentSkills({
    skills,
    agentConfiguration,
    additionalSkillIds,
    builtInCapabilitySkillIds: getBuiltInCapabilitySkillIds(agentConfiguration),
  });
  for (const skill of agentSkills) {
    skillsStore.add(skill);
  }
  return agentSkills;
};
