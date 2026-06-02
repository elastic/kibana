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
import { createSigEventsMemorySkill } from './skills/sig_events_memory_skill';
import { registerAgentBuilderSkills } from './skills/register_skills';
import { createSignificantEventAttachmentType } from './attachments/significant_event_attachment_type';
import { createSignificantEventSmlType } from './sml/significant_event_sml_type';

export const createMemoryToolsOptions = ({
  server,
  logger,
}: {
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
  };
};

export const registerStreamsAgentBuilder = async ({
  agentBuilder,
  agentContextLayer,
  getScopedClients,
  server,
  logger,
  telemetry,
  isMemoryEnabled,
  streamsKIsOnboardingClient,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  agentContextLayer?: AgentContextLayerPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
  isMemoryEnabled: () => Promise<boolean>;
  streamsKIsOnboardingClient?: StreamsKIsOnboardingClient;
}) => {
<<<<<<< HEAD
  registerAgentBuilderTools({
    agentBuilder,
    getScopedClients,
    server,
    logger,
    telemetry,
  });
=======
  agentBuilder.attachments.registerType(
    createSignificantEventAttachmentType({
      logger: logger.get('significant_event_attachment'),
      getScopedClients,
    }) as Parameters<typeof agentBuilder.attachments.registerType>[0]
  );

  agentContextLayer?.registerType(
    createSignificantEventSmlType({
      logger: logger.get('significant_event_sml'),
      getScopedClients,
    })
  );

  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger, telemetry });
>>>>>>> fdbc2dd858de ([Sig Events] Register Sig Event attachment type)
  registerAgentBuilderSkills({ agentBuilder, telemetry, streamsKIsOnboardingClient });

  const memoryToolsOptions = createMemoryToolsOptions({ server, logger });

  // The memory skill is registered lazily — only once the significant events memory feature flag is on.
  // This avoids exposing the skill to the agent when memory is not configured.
  let memorySkillRegistered = false;

  const ensureMemorySkillRegistered = () => {
    if (memorySkillRegistered) {
      return;
    }
    memorySkillRegistered = true;
    agentBuilder.skills.register(createSigEventsMemorySkill(memoryToolsOptions));
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
