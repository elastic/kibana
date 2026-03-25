/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { GetScopedClients } from '../routes/types';
import type { StreamsServer } from '../types';
import { MemoryServiceImpl } from '../lib/memory';
import { registerAgentBuilderTools } from './tools/register_tools';
import { registerMemoryTools } from './tools/register_memory_tools';
import { registerMemoryContextHook } from './hooks/memory/register_memory_context_hook';
import { registerMemoryLearningHook } from './hooks/memory/register_memory_learning_hook';
import { registerSigeventsMemoryHook } from './hooks/memory/register_sigevents_memory_hook';
import { streamExplorationSkill } from './skills/stream_exploration_skill';

export const registerStreamsAgentBuilder = ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  getSpaces,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  getSpaces: () => SpacesPluginStart | undefined;
}) => {
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger });

  const getMemoryService = () =>
    new MemoryServiceImpl({
      logger: logger.get('memory'),
      esClient: server.core.elasticsearch.client.asInternalUser,
    });

  registerMemoryTools({
    agentBuilder,
    getMemoryService,
    getSecurity: () => server.core.security,
    logger,
  });

  const getMemoryServices = () => ({
    memory: getMemoryService(),
    spaces: getSpaces(),
  });

  registerMemoryContextHook(agentBuilder, {
    logger,
    getMemoryServices,
  });

  registerMemoryLearningHook(agentBuilder, {
    logger,
    getMemoryServices,
  });

  registerSigeventsMemoryHook(agentBuilder, {
    logger,
    getMemoryServices,
  });

  agentBuilder.skills.register(streamExplorationSkill);
};
