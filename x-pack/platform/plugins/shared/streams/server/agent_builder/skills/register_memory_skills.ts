/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { MemoryToolsOptions } from '../tools/memory';
import { createSigEventsMemorySkill } from './sig_events_memory_skill';
import {
  createMemorySynthesisSkill,
  createMemoryConsolidationSkill,
  createConversationScraperSkill,
} from './memory';

export const registerStreamsMemoryAgentBuilder = async ({
  agentBuilder,
  memoryToolsOptions,
  logger,
  isMemoryEnabled,
}: {
  agentBuilder: AgentBuilderPluginStart;
  memoryToolsOptions: MemoryToolsOptions;
  logger: Logger;
  isMemoryEnabled: () => Promise<boolean>;
}): Promise<{
  ensureMemorySkillRegistered: () => void;
  onMemorySettingChanged: () => Promise<void>;
}> => {
  let memorySkillsRegistered = false;

  const ensureMemorySkillsRegistered = async () => {
    if (memorySkillsRegistered || !(await isMemoryEnabled())) {
      return;
    }
    memorySkillsRegistered = true;

    const memorySkills = [
      createSigEventsMemorySkill(memoryToolsOptions),
      createMemorySynthesisSkill(memoryToolsOptions),
      createMemoryConsolidationSkill(memoryToolsOptions),
      createConversationScraperSkill(memoryToolsOptions),
    ];

    await Promise.all(memorySkills.map((skill) => agentBuilder.skills.register(skill)));

    logger.info('Streams memory skills registered (observability:streamsEnableMemory is enabled)');
  };

  await ensureMemorySkillsRegistered();

  return {
    ensureMemorySkillRegistered: () => {
      void ensureMemorySkillsRegistered();
    },
    onMemorySettingChanged: ensureMemorySkillsRegistered,
  };
};
