/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '../types';
import type { GetScopedClients } from '../routes/types';
import type { ModelSettingsConfigClient } from '../lib/saved_objects/significant_events/model_settings_config_client';
import { MemoryServiceImpl } from '../lib/memory';
import { registerAgentBuilderTools } from './tools/register_tools';
import { registerMemoryContextHook } from './hooks/memory/register_memory_context_hook';
import { streamExplorationSkill } from './skills/stream_exploration_skill';
import { createSigEventsMemorySkill } from './skills/sig_events_memory_skill';

export const registerStreamsAgentBuilder = async ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  getModelSettingsClient,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  getModelSettingsClient: () => ModelSettingsConfigClient | undefined;
}) => {
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger });

  const getMemoryService = () =>
    new MemoryServiceImpl({
      logger: logger.get('memory'),
      esClient: server.core.elasticsearch.client.asInternalUser,
    });

  const isMemoryEnabled = async (): Promise<boolean> => {
    try {
      const client = getModelSettingsClient();
      if (!client) return false;
      const settings = await client.getSettings();
      return settings.useMemory ?? false;
    } catch {
      return false;
    }
  };

  agentBuilder.skills.register(streamExplorationSkill);

  // Hooks are always registered — they check isMemoryEnabled() at runtime and no-op when disabled.
  const getMemoryServices = () => ({
    memory: getMemoryService(),
  });

  registerMemoryContextHook(agentBuilder, {
    logger,
    getMemoryServices,
    isMemoryEnabled,
  });

  // The memory skill is registered lazily — only once useMemory is enabled.
  // This avoids exposing the skill to the agent when memory is not configured.
  // Call ensureMemorySkillRegistered() after enabling the useMemory setting.
  let memorySkillRegistered = false;

  const ensureMemorySkillRegistered = () => {
    if (memorySkillRegistered) {
      return;
    }
    memorySkillRegistered = true;
    agentBuilder.skills.register(
      createSigEventsMemorySkill({
        getMemoryService,
        getSecurity: () => server.core.security,
      })
    );
    logger.info('Memory skill registered (useMemory is enabled)');
  };

  if (await isMemoryEnabled()) {
    ensureMemorySkillRegistered();
  }

  return { ensureMemorySkillRegistered };
};
