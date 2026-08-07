/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import { createMemoryConsolidationSkill } from './consolidation/skill';
import { createConversationScraperSkill } from './conversation_scraper/skill';
import { createGapDetectionSkill } from './gap_detection/skill';
import { createAgentMemorySkill } from './memory/skill';

const SKILL_FACTORIES = [
  createAgentMemorySkill,
  createMemoryConsolidationSkill,
  createConversationScraperSkill,
  createGapDetectionSkill,
];

export const AGENT_MEMORY_SKILL_IDS = SKILL_FACTORIES.map((create) => create().id);

/**
 * Registers the memory skills.
 *
 * All of them request their tools from the registry, so there is nothing to gate
 * here: when memory is unavailable the tools are filtered out and the skill loads
 * with an empty toolset. (Skills cannot be unregistered once registered, which is
 * why the old inline-tool implementation needed a wrapper to hide its tools.)
 */
export const registerMemorySkills = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}): void => {
  for (const create of SKILL_FACTORIES) {
    agentBuilder.skills.register(create());
  }
};
