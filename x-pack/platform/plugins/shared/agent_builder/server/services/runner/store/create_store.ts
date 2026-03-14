/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Conversation } from '@kbn/agent-builder-common';
import { VirtualFileSystem } from './filesystem';
import { createResultStore } from './volumes/tool_results';
import { FileSystemStore } from './store';
import { createSkillsStore } from './volumes/skills/skills_store';

export const filterSkillsBySelection = <T extends { id: string }>(
  skills: T[],
  selection: string[] | undefined
): T[] => {
  if (selection === undefined) return skills;
  if (selection.length === 0) return [];
  const selectedIds = new Set(selection);
  return skills.filter((skill) => selectedIds.has(skill.id));
};

export const createStore = ({ conversation }: { conversation?: Conversation }) => {
  const filesystem = new VirtualFileSystem();

  const resultStore = createResultStore({ conversation });
  const skillsStore = createSkillsStore({ skills: [] });
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
