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
import type { SkillRegistry } from '../../skills';

export const createStore = async ({
  conversation,
  skillRegistry,
}: {
  conversation?: Conversation;
  skillRegistry: SkillRegistry;
}) => {
  const filesystem = new VirtualFileSystem();

  const skills = await skillRegistry.listSkillDefinitions();

  const resultStore = createResultStore({ conversation });
  const skillsStore = createSkillsStore({ skills });
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
