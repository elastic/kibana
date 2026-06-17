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
import { createSigEventsOnboardingSkill } from './skills/sigevents_onboarding_skill';
import { registerAgentBuilderSkills } from './skills/register_skills';
import { registerAgentBuilderAttachments } from './attachments/register_attachments';
import { registerAgentBuilderSmlTypes } from './sml/register_sml_types';
import { registerSignificantEventsDiscoveryAgents } from './agents/discovery';
import { registerInvestigationAgents } from './agents/investigation';

type AgentDefinition = Parameters<AgentBuilderPluginSetup['agents']['register']>[0];

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

const gapDetectorAgent: AgentDefinition = {
  id: 'sigevents.memory.gap-detector',
  name: 'Gap Detector',
  description:
    'Audits the sigevents memory knowledge base against 11 required knowledge dimensions and writes a structured gaps page listing everything that is unknown, ambiguous, or missing.',
  configuration: {
    skill_ids: ['streams-gap-detection'],
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
  const memoryToolsOptions = createMemoryToolsOptions({ getScopedClients, server, logger });

  registerAgentBuilderAttachments({ agentBuilder, getScopedClients, logger });
  registerAgentBuilderSmlTypes({ agentContextLayer, getScopedClients });
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger, telemetry });
  registerAgentBuilderSkills({
    agentBuilder,
    telemetry,
    streamsKIsOnboardingClient,
  });
  registerSignificantEventsDiscoveryAgents({ agentBuilder, server });
  registerInvestigationAgents(agentBuilder);

  agentBuilder.agents.register(systemOnboardingAgent);
  agentBuilder.agents.register(gapDetectorAgent);
  logger.info('sigevents memory agents registered');

  let memorySkillRegistered = false;

  const ensureMemorySkillRegistered = () => {
    if (memorySkillRegistered) {
      return;
    }
    memorySkillRegistered = true;
    agentBuilder.skills.register(createSigEventsMemorySkill(memoryToolsOptions));
    agentBuilder.skills.register(createSigEventsOnboardingSkill(memoryToolsOptions));
    logger.info(
      'Memory skill registered (streams.significantEventsMemoryEnabled feature flag is enabled)'
    );
  };

  if (await isMemoryEnabled()) {
    ensureMemorySkillRegistered();
  }

  server.ensureMemorySkillRegistered = ensureMemorySkillRegistered;

  return {
    ensureMemorySkillRegistered,
    onMemorySettingChanged: async () => {
      if (await isMemoryEnabled()) {
        ensureMemorySkillRegistered();
      }
    },
  };
};
