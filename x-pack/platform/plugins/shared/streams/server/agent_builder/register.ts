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
import type { StreamsKIsOnboardingClient } from '../lib/workflows/onboarding_workflow_client';
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
  streamsKIsOnboardingClient,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  isMemoryEnabled: () => Promise<boolean>;
  streamsKIsOnboardingClient?: StreamsKIsOnboardingClient;
}) => {
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger, telemetry });
  registerAgentBuilderSkills({ agentBuilder, telemetry, streamsKIsOnboardingClient });

  const getMemoryService = () =>
    new MemoryServiceImpl({
      logger: logger.get('memory'),
      esClient: server.core.elasticsearch.client.asInternalUser,
    });

  // The memory skill is registered lazily — only once the significant events memory feature flag is on.
  // This avoids exposing the skill to the agent when memory is not configured.
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
    logger.info(
      'Memory skill registered (streams.significantEventsMemoryEnabled feature flag is enabled)'
    );
  };

  if (await isMemoryEnabled()) {
    ensureMemorySkillRegistered();
  }

  return {
    ensureMemorySkillRegistered,
  };
};
