/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import type { StreamsPluginStartDependencies, StreamsServer } from '../types';
import type { GetAgentBuilderScopedClients } from './types';
import type { EbtTelemetryClient } from '../lib/telemetry/ebt';

import { registerAgentBuilderTools } from './tools/register_tools';
import { registerAgentBuilderSkills } from './skills/register_skills';
import { createStreamsToolAvailability } from './utils/get_streams_tool_availability';

export const registerStreamsAgentBuilder = ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
  telemetry,
  core,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetAgentBuilderScopedClients;
  server: Pick<StreamsServer, 'isServerless'>;
  logger: Logger;
  telemetry?: EbtTelemetryClient;
  core: CoreSetup<StreamsPluginStartDependencies>;
}): void => {
  const availability = createStreamsToolAvailability(core, logger);

  registerAgentBuilderTools({
    agentBuilder,
    getScopedClients,
    server,
    logger,
    telemetry,
    availability,
  });
  registerAgentBuilderSkills({
    agentBuilder,
    availability,
  });
};
