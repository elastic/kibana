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
import type { CreateRunnerDeps } from '../runner';
import type { CompositeSkillRegistry } from '../../skills/composite_skill_registry';

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
 * Resolves skills using the composite registry when available,
 * falling back to built-in skills only via skillServiceStart.
 */
const resolveSkills = async ({
  skillSelection,
  skillRegistry,
  runnerDeps,
}: {
  skillSelection?: SkillSelection[];
  skillRegistry?: CompositeSkillRegistry;
  runnerDeps: Omit<CreateRunnerDeps, 'modelProviderFactory'>;
}): Promise<SkillDefinition[]> => {
  // When a composite registry is available and there is a skill selection,
  // use resolveSkillSelection to include user-created skills
  if (skillRegistry && skillSelection) {
    return skillRegistry.resolveSkillSelection(skillSelection);
  }

  // Fallback: use built-in skills only and filter locally
  const { skillServiceStart } = runnerDeps;
  const allSkills = skillServiceStart.listSkills();
  return filterSkillsBySelection(allSkills, skillSelection);
};

export const createStore = async ({
  conversation,
  runnerDeps,
  skillSelection,
  skillRegistry,
}: {
  conversation?: Conversation;
  runnerDeps: Omit<CreateRunnerDeps, 'modelProviderFactory'>;
  skillSelection?: SkillSelection[];
  skillRegistry?: CompositeSkillRegistry;
}) => {
  const filesystem = new VirtualFileSystem();

  const filteredSkills = await resolveSkills({ skillSelection, skillRegistry, runnerDeps });

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
