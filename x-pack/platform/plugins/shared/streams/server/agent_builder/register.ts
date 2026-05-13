/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AgentContextLayerPluginSetup } from '@kbn/agent-context-layer-plugin/server';
import type { StreamsServer } from '../types';
import type { GetScopedClients } from '../routes/types';
import type { EbtTelemetryClient } from '../lib/telemetry/ebt';
import type { StreamsKIsOnboardingClient } from '../lib/workflows/onboarding_workflow_client';
import { MemoryServiceImpl } from '../lib/memory';
import type { MemoryToolsOptions } from './tools/memory';
import { registerAgentBuilderTools } from './tools/register_tools';
import { registerAgentBuilderSkills } from './skills/register_skills';
import { registerAgentBuilderAttachments } from './attachments/register_attachments';
import { registerAgentBuilderSmlTypes } from './sml/register_sml_types';
import { registerSignificantEventsDiscoveryAgents } from './agents/discovery';

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

const systemOnboardingAgent: AgentDefinition = {
  id: 'sigevents.memory.system-onboarding',
  name: 'System Onboarding',
  description:
    'Interviews the user to build a mental model of their system and stores operational context in the sigevents memory knowledge base.',
  configuration: {
    skill_ids: ['significant-events-onboarding'],
    tools: [],
  },
};

export const createMemoryToolsOptions = ({
  getScopedClients,
  server,
  logger,
}: {
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}): MemoryToolsOptions => {
  const getMemoryService = (esClient: ElasticsearchClient) =>
    new MemoryServiceImpl({
      logger: logger.get('memory'),
      esClient,
    });

  return {
    getMemoryService,
    getSecurity: () => server.core.security,
    getScopedClients,
    server,
    logger,
  };
};

export const registerStreamsAgentBuilder = async ({
  agentBuilder,
  agentContextLayer,
  getScopedClients,
  server,
  logger,
  telemetry,
  streamsKIsOnboardingClient,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  agentContextLayer?: AgentContextLayerPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  streamsKIsOnboardingClient?: StreamsKIsOnboardingClient;
}): Promise<void> => {
  const memoryToolsOptions = createMemoryToolsOptions({ getScopedClients, server, logger });

  registerAgentBuilderAttachments({ agentBuilder, getScopedClients, logger });
  registerAgentBuilderSmlTypes({ agentContextLayer, getScopedClients });
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger, telemetry });
  registerAgentBuilderSkills({ agentBuilder, telemetry, streamsKIsOnboardingClient, memoryToolsOptions });
  registerSignificantEventsDiscoveryAgents(agentBuilder);

  agentBuilder.agents.register(memorySynthesizerAgent);
  agentBuilder.agents.register(memoryConsolidatorAgent);
  agentBuilder.agents.register(conversationScraperAgent);
  agentBuilder.agents.register(systemOnboardingAgent);
  logger.info('sigevents memory agents registered');
};
