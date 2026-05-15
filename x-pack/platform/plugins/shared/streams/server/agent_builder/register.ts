/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { StreamsServer } from '../types';
import type { GetScopedClients } from '../routes/types';
import type { EbtTelemetryClient } from '../lib/telemetry/ebt';
import { MemoryServiceImpl } from '../lib/memory';
import { registerAgentBuilderTools } from './tools/register_tools';
import { createSigEventsMemorySkill } from './skills/sig_events_memory_skill';
import { registerAgentBuilderSkills } from './skills/register_skills';

type AgentDefinition = Parameters<AgentBuilderPluginSetup['agents']['register']>[0];

const memorySynthesizerAgent: AgentDefinition = {
  id: 'sigevents.memory.synthesizer',
  name: 'Memory Synthesizer',
  description:
    'Synthesizes significant events knowledge indicators into memory wiki pages using ES|QL read tools and the write_memory_page workflow.',
  configuration: {
    skill_ids: ['streams-memory-synthesis'],
    tools: [],
  },
};

const memoryConsolidatorAgent: AgentDefinition = {
  id: 'sigevents.memory.consolidator',
  name: 'Memory Consolidator',
  description:
    'Curates the memory knowledge base by merging duplicates, removing stale entries, and improving categorization.',
  configuration: {
    skill_ids: ['streams-memory-consolidation'],
    tools: [],
  },
};

const conversationScraperAgent: AgentDefinition = {
  id: 'sigevents.memory.conversation-scraper',
  name: 'Conversation Scraper',
  description:
    'Extracts durable knowledge from AI chat conversations and persists it as memory wiki pages.',
  configuration: {
    skill_ids: ['streams-conversation-scraper'],
    tools: [],
  },
};

export const registerStreamsAgentBuilder = async ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
  workflowsManagement,
  isMemoryEnabled,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  workflowsManagement?: WorkflowsServerPluginSetup;
  isMemoryEnabled: () => Promise<boolean>;
}) => {
  const getMemoryService = () =>
    new MemoryServiceImpl({
      logger: logger.get('memory'),
      esClient: server.core.elasticsearch.client.asInternalUser,
    });

  const memoryToolsOptions = {
    getMemoryService,
    getSecurity: () => server.core.security,
    getScopedClients,
    server,
    logger,
  };

  await registerAgentBuilderTools({
    agentBuilder,
    getScopedClients,
    server,
    logger,
    telemetry,
    workflowsManagement,
  });
  registerAgentBuilderSkills({ agentBuilder, getScopedClients, telemetry, memoryToolsOptions });

  agentBuilder.agents.register(memorySynthesizerAgent);
  agentBuilder.agents.register(memoryConsolidatorAgent);
  agentBuilder.agents.register(conversationScraperAgent);
  logger.info('sigevents memory agents registered');

  let memorySkillRegistered = false;

  const ensureMemorySkillRegistered = () => {
    if (memorySkillRegistered) {
      return;
    }
    memorySkillRegistered = true;
    agentBuilder.skills.register(createSigEventsMemorySkill(memoryToolsOptions));
    logger.info('Memory skill registered (observability:streamsEnableMemory is enabled)');
  };

  if (await isMemoryEnabled()) {
    ensureMemorySkillRegistered();
  }

  return {
    ensureMemorySkillRegistered,
    onMemorySettingChanged: async () => {
      if (await isMemoryEnabled()) {
        ensureMemorySkillRegistered();
      }
    },
  };
};
