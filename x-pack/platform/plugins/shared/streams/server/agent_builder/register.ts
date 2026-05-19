/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import type { StreamsServer } from '../types';
import type { GetScopedClients } from '../routes/types';
import type { EbtTelemetryClient } from '../lib/telemetry/ebt';
import { MemoryServiceImpl } from '../lib/memory';
import { registerAgentBuilderTools } from './tools/register_tools';
import { createSigEventsMemorySkill } from './skills/sig_events_memory_skill';
import { registerAgentBuilderSkills } from './skills/register_skills';

export const registerStreamsAgentBuilder = async ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
  isMemoryEnabled,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  isMemoryEnabled: () => Promise<boolean>;
}) => {
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger, telemetry });
  registerAgentBuilderSkills({ agentBuilder, getScopedClients, telemetry });

  const getMemoryService = () =>
    new MemoryServiceImpl({
      logger: logger.get('memory'),
      esClient: server.core.elasticsearch.client.asInternalUser,
    });

  // The memory skill is registered lazily — only once the Streams memory advanced setting is on.
  // This avoids exposing the skill to the agent when memory is not configured.
  // Call onMemorySettingChanged when observability:streamsEnableMemory may have changed (e.g. from a uiSettings subscription).
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
    logger.info('Memory skill registered (observability:streamsEnableMemory is enabled)');
  };

  if (await isMemoryEnabled()) {
    ensureMemorySkillRegistered();
  }

  return {
    ensureMemorySkillRegistered,
    /**
     * Call this from a uiSettings change subscription (e.g. in plugin start)
     * to auto-register the memory skill when the setting is toggled on.
     */
    onMemorySettingChanged: async () => {
      if (await isMemoryEnabled()) {
        ensureMemorySkillRegistered();
      }
    },
  };
};
