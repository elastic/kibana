/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import type { GetScopedClients } from '../routes/types';
import type { StreamsServer } from '../types';
import {
  createListStreamsTool,
  createListFeaturesTool,
  createListQueriesTool,
  createListSignificantEventsTool,
  createListDiscoveriesTool,
} from './tools';

export const registerSigEventsTools = (
  agentBuilder: AgentBuilderPluginSetup,
  getScopedClients: GetScopedClients,
  server: StreamsServer
): void => {
  const deps = { getScopedClients, server };

  agentBuilder.tools.register(createListStreamsTool(deps));
  agentBuilder.tools.register(createListFeaturesTool(deps));
  agentBuilder.tools.register(createListQueriesTool(deps));
  agentBuilder.tools.register(createListSignificantEventsTool(deps));
  agentBuilder.tools.register(createListDiscoveriesTool(deps));
};
