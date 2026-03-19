/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { Logger } from '@kbn/core/server';
import type { GetScopedClients } from '../routes/types';
import type { StreamsServer } from '../types';
import { registerAgentBuilderTools } from './tools/register_tools';

export const registerStreamsAgentBuilder = ({
  agentBuilder,
  getScopedClients,
  server,
  logger,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  getScopedClients: GetScopedClients;
  server: StreamsServer;
  logger: Logger;
}) => {
  registerAgentBuilderTools({ agentBuilder, getScopedClients, server, logger });
  // TODO: Register skills here
};
