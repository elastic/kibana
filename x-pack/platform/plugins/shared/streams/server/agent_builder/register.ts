/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import type { GetScopedClients } from '../routes/types';
import type { StreamsServer } from '../types';
import type { ModelSettingsConfigClient } from '../lib/saved_objects/significant_events/model_settings_config_client';
import { MemoryServiceImpl } from '../lib/memory';
import {
  MEMORY_UPDATE_TASK_TYPE,
  type MemoryUpdateTaskParams,
} from '../lib/tasks/task_definitions/memory_update';
import { registerAgentBuilderTools } from './tools/register_tools';
import { registerMemoryContextHook } from './hooks/memory/register_memory_context_hook';
import { registerMemoryLearningHook } from './hooks/memory/register_memory_learning_hook';
import { registerSigeventsMemoryHook } from './hooks/memory/register_sigevents_memory_hook';
import { streamExplorationSkill } from './skills/stream_exploration_skill';
import { createSigEventsMemorySkill } from './skills/sig_events_memory_skill';

export const registerStreamsAgentBuilder = async ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  getSpaces,
  getModelSettingsClient,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  getSpaces: () => SpacesPluginStart | undefined;
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

  if (await isMemoryEnabled()) {
    const getMemoryServices = () => ({
      memory: getMemoryService(),
      spaces: getSpaces(),
    });

    const scheduleMemoryTask = async (
      triggerId: string,
      payload: Record<string, unknown>,
      request: KibanaRequest
    ) => {
      const { taskClient } = await getScopedClients({ request });
      const taskId = `memory_update_${triggerId}_${Date.now()}`;
      await taskClient.schedule<MemoryUpdateTaskParams>({
        task: {
          type: MEMORY_UPDATE_TASK_TYPE,
          id: taskId,
          space: '*',
        },
        params: { triggerId, payload },
        request,
      });
      logger.info(`Scheduled memory update task "${taskId}" for trigger "${triggerId}"`);
    };

    registerMemoryContextHook(agentBuilder, {
      logger,
      getMemoryServices,
      isMemoryEnabled,
    });

    registerMemoryLearningHook(agentBuilder, {
      logger,
      getMemoryServices,
      isMemoryEnabled,
    });

    registerSigeventsMemoryHook(agentBuilder, {
      logger,
      getMemoryServices,
      isMemoryEnabled,
      scheduleMemoryTask,
    });

    agentBuilder.skills.register(
      createSigEventsMemorySkill({
        getMemoryService,
        getSecurity: () => server.core.security,
      })
    );

    logger.info('Memory skill and hooks registered (useMemory is enabled)');
  }
};
