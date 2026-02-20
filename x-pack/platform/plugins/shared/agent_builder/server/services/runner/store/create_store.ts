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
import type { CreateRunnerDeps } from '../runner';

export const createStore = ({
  conversation,
  runnerDeps,
}: {
  conversation?: Conversation;
  runnerDeps: Omit<CreateRunnerDeps, 'modelProviderFactory'>;
}) => {
  const { skillServiceStart } = runnerDeps;
  const filesystem = new VirtualFileSystem();

  const resultStore = createResultStore({ conversation });
  const skillsStore = createSkillsStore({ skills: skillServiceStart.listSkills() });
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
