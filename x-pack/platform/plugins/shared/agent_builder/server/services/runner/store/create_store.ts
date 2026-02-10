/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation, SkillSelection } from '@kbn/agent-builder-common';
import { hasSkillSelectionWildcard, getExplicitSkillIds } from '@kbn/agent-builder-common';
import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { VirtualFileSystem } from './filesystem';
import { createResultStore } from './volumes/tool_results';
import { FileSystemStore } from './store';
import { createSkillsStore } from './volumes/skills/skills_store';
import type { SkillRegistry } from '../../skills';

/**
 * Filters skills based on the agent's skill selection.
 * - If no selection provided: returns all skills (backward compatibility)
 * - If empty selection: returns empty array
 * - If wildcard '*': returns all skills
 * - If explicit IDs: returns matching skills from the provided list
 */
export const filterSkillsBySelection = (
  allSkills: SkillDefinition[],
  skillSelection?: SkillSelection[]
): SkillDefinition[] => {
  // If no selection is specified, return all skills (backward compat)
  if (skillSelection === undefined) {
    return allSkills;
  }

  if (skillSelection.length === 0) {
    return [];
  }

  if (hasSkillSelectionWildcard(skillSelection)) {
    // Wildcard means all built-in skills, plus any explicitly listed ones
    return allSkills;
  }

  // No wildcard: only return explicitly selected skills
  const selectedIds = new Set(getExplicitSkillIds(skillSelection));
  return allSkills.filter((skill) => selectedIds.has(skill.id));
};

/**
 * Resolves skills using the skill registry.
 * When a skill selection is provided, uses resolveSkillSelection (includes user-created skills).
 * Otherwise, returns all built-in skills for backward compatibility.
 */
const resolveSkills = async ({
  skillSelection,
  skillRegistry,
}: {
  skillSelection?: SkillSelection[];
  skillRegistry: SkillRegistry;
}): Promise<SkillDefinition[]> => {
  if (skillSelection) {
    return skillRegistry.resolveSkillSelection(skillSelection);
  }

  // No selection: return all built-in skills (backward compat)
  return skillRegistry.listSkillDefinitions();
};

export const createStore = async ({
  conversation,
  skillSelection,
  skillRegistry,
}: {
  conversation?: Conversation;
  skillSelection?: SkillSelection[];
  skillRegistry: SkillRegistry;
}) => {
  const filesystem = new VirtualFileSystem();

  const filteredSkills = await resolveSkills({ skillSelection, skillRegistry });

  const resultStore = createResultStore({ conversation });
  const skillsStore = createSkillsStore({ skills: filteredSkills });
  filesystem.mount(resultStore.getVolume());
  filesystem.mount(skillsStore.getVolume());

  const filestore = new FileSystemStore({ filesystem });

  return {
    filesystem,
    filestore,
    resultStore,
    skillsStore,
  };
};
