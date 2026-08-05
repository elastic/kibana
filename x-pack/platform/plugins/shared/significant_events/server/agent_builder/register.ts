/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { GetScopedClients } from '../routes/types';
import type { EbtTelemetryClient } from '../lib/telemetry/ebt';
import { MemoryServiceImpl } from '../memory_and_investigation/lib/memory';
import type { MemoryToolsOptions } from '../memory_and_investigation/tools/memory';
import { registerAgentBuilderTools } from './tools/register_tools';
import { registerAgentBuilderAttachments } from './attachments/register_attachments';

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

/**
 * Registers the significant events agent-builder tools and attachments at setup.
 *
 * These are intentionally left registered regardless of the `streams.significantEventsAvailable`
 * flag: their registration APIs are setup-only and cannot be driven dynamically once `start()`
 * has run, so they rely on request-time gating instead. Skills, which support start-phase
 * registration, are gated by the availability flag from `start()` (see `registerSignificantEventsSkills`).
 *
 * Discovery agents are registered as agent types from plugin setup (see
 * `registerSignificantEventsDiscoveryAgentTypes`) and installed as editable profiles via
 * `installDiscoveryAgents`.
 *
 * Code Intelligence KI extraction is driven by the externally-installed Sourcerer
 * agent (`sourcerer setup`), so this plugin registers no code-research agent/tools/
 * skills of its own; the extraction workflow targets that agent and gates on its
 * presence.
 */
export const registerStreamsAgentBuilder = async ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
  telemetry: EbtTelemetryClient;
}): Promise<void> => {
  registerAgentBuilderAttachments({ agentBuilder, getScopedClients, logger });
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger, telemetry });
};
